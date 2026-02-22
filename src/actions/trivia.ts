import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  userMention,
} from "discord.js";
import { Currency } from "./store.js";
import moment from "moment";
import { CustomEmbed } from "../utils/embed.js";
import { gem_emoji } from "../index.js";
import { addCurrency, hasEnoughCurrency, takeCurrency } from "../db/prisma.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs/promises";
import path from "path";
import he from "he";
import { getRandomFromArray } from "../utils/helpers.js";

type InteractionT = ChatInputCommandInteraction<CacheType>;

export class Trivia {
  static #API_URL = "https://opentdb.com/api.php?amount=10";
  static #PATH = "./assets/trivia";
  static #MAPS = new Map<
    number,
    { x: number; y: number; size: number; gap: number }
  >()
    .set(1, { x: 534, y: 216, size: 194, gap: 25 })
    .set(2, { x: 450, y: 155, size: 221, gap: 45 });

  static #DIFFICULTY_DATA: Map<string, { time_limit: number; emoji: string }> =
    new Map()
      .set("easy", { time_limit: 10, emoji: "😁" })
      .set("medium", { time_limit: 20, emoji: "😐" })
      .set("hard", { time_limit: 30, emoji: "😈" });

  #interaction: InteractionT;
  #bet: {
    amount: number;
    currency: Currency;
  };
  #players: Map<string, string>;
  #map: number;

  constructor(interaction: InteractionT) {
    this.#interaction = interaction;

    const currency: Currency = parseInt(
      interaction.options.getString("currency", true),
    );
    this.#bet = {
      amount: Math.min(
        interaction.options.getNumber("bet", true),
        currency == Currency.COIN ? 500_000_000 : 5,
      ),
      currency,
    };

    this.#players = new Map();
    this.#map = getRandomFromArray(Array.from(Trivia.#MAPS.keys()))!;

    (async () => {
      try {
        await this.#sendLobby();

        const winners = await this.#showdown();

        await this.#handleResults(winners);
      } catch {
        await interaction.deleteReply();
      }
    })();
  }

  async #sendLobby() {
    return new Promise<void>(async (res, rej) => {
      const end_time = moment().add(5, "minutes");

      const replyOptions = () => {
        return {
          content: "",
          embeds: [
            new CustomEmbed()
              .setTitle("❓ TRIVIA ❓")
              .setDescription(
                `Game will start <t:${Math.floor(end_time.valueOf() / 1000)}:R> or when reaching 8 players`,
              )
              .setFields(
                {
                  name: "👥 Contestants",
                  value: Array.from(this.#players.keys())
                    .map((hider) => userMention(hider))
                    .join(" "),
                },
                {
                  name: "💸 Bet",
                  value:
                    `${this.#bet.currency == Currency.COIN ? "🪙" : "💎"} ${this.#bet.amount}`.replace(
                      "💎",
                      gem_emoji.embed,
                    ),
                  inline: true,
                },
                {
                  name: "🏆 Prize Pool",
                  value:
                    `${this.#bet.currency == Currency.COIN ? "🪙" : "💎"} ${this.#players.size * this.#bet.amount}`.replace(
                      "💎",
                      gem_emoji.embed,
                    ),
                  inline: true,
                },
              ),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
              new ButtonBuilder()
                .setCustomId("join")
                .setLabel("🃏 Join")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("start")
                .setLabel("✅ Start")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId("exit")
                .setLabel("❌ Exit")
                .setStyle(ButtonStyle.Danger),
            ),
          ],
        };
      };

      await this.#interaction.deferReply();

      const collector = (
        await this.#interaction.editReply(replyOptions())
      ).createMessageComponentCollector({
        time: 300_000,
      });

      collector.on("collect", async (request) => {
        await request.deferUpdate();

        switch (request.customId) {
          case "join":
            if (this.#players.has(request.user.id)) return;

            if (
              await hasEnoughCurrency(
                request.user.id,
                this.#bet.amount,
                this.#bet.currency,
              )
            )
              await takeCurrency(
                request.user.id,
                this.#bet.amount,
                this.#bet.currency,
              );
            else return;

            this.#players.set(request.user.id, request.user.avatarURL() ?? "");

            if (this.#players.size >= 8) {
              collector.stop();
              break;
            }

            await request.editReply(replyOptions());
            break;

          case "start":
            // if (
            //   request.user.id == this.#interaction.user.id &&
            //   this.#players.size >= 2
            // )
            collector.stop();

            break;

          case "exit":
            if (!this.#players.has(request.user.id)) return;

            this.#players.delete(request.user.id);

            await addCurrency(
              request.user.id,
              this.#bet.amount,
              this.#bet.currency,
            );
            await request.editReply(replyOptions());

            break;
        }
      });

      collector.on("end", async () => {
        // if (this.#players.size < 2) {
        //   for (const id of [...Array.from(this.#players.keys())])
        //     await addCurrency(id, this.#bet.amount, this.#bet.currency);

        //   return rej();
        // }

        return res();
      });
    });
  }

  async #getQuestions() {
    const res = await fetch(Trivia.#API_URL);
    const data = (await res.json()) as {
      response_code: number;
      results: {
        category: string;
        type: string;
        difficulty: string;
        question: string;
        correct_answer: string;
        incorrect_answers: string[];
      }[];
    };

    return data.results.map((question) => ({
      ...question,
      question: he.decode(question.question),
      correct_answer: he.decode(question.correct_answer),
      incorrect_answers: question.incorrect_answers.map((answer) =>
        he.decode(answer),
      ),
    }));
  }

  async #showdown() {
    const questions = await this.#getQuestions();
    const players_answered: Map<string, number> = new Map();
    const players_still_in: Map<string, string> = new Map(this.#players);

    for (const question of questions) {
      await new Promise<void>(async (res, rej) => {
        const buttons: ButtonBuilder[] = [];

        const all_answers = [
          question.correct_answer,
          ...question.incorrect_answers,
        ].sort(() => Math.random() - 0.5);

        const correct_answer_index = all_answers.findIndex(
          (answer) => answer == question.correct_answer,
        );

        const difficulty_data = Trivia.#DIFFICULTY_DATA.get(
          question.difficulty,
        )!;

        difficulty_data.time_limit +=
          question.question.split(" ").length +
          all_answers.reduce(
            (acc, answer) => acc + answer.split(" ").length,
            0,
          );

        for (let i = 0; i < all_answers.length; i++)
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`answer_${i}`)
              .setLabel(String.fromCharCode("A".charCodeAt(0) + i))
              .setStyle(ButtonStyle.Primary),
          );

        const msg = await this.#interaction.editReply({
          content: "",
          embeds: [
            new CustomEmbed()
              .setTitle(question.question)
              .setDescription(
                all_answers
                  .map(
                    (answer, i) =>
                      `${String.fromCharCode("A".charCodeAt(0) + i)}. ${answer}`,
                  )
                  .join("\n"),
              )
              .setFields(
                {
                  name: "📚 Category",
                  value: question.category,
                  inline: true,
                },
                {
                  name: "📈 Difficulty",
                  value: `${difficulty_data.emoji} ${question.difficulty}`,
                  inline: true,
                },
                {
                  name: "🕑 Round ends",
                  value: `<t:${Math.floor(moment().add(difficulty_data.time_limit, "seconds").valueOf() / 1000)}:R>`,
                  inline: true,
                },
              )
              .setImage("attachment://bg.jpg"),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(...buttons),
          ],
          files: [await this.#getCanvasAttachment(players_still_in)],
        });

        const collector = msg.createMessageComponentCollector({
          time: difficulty_data.time_limit * 1000,
          filter: (interaction) => players_still_in.has(interaction.user.id),
        });

        collector.on("collect", async (request) => {
          await request.deferUpdate();

          if (players_answered.has(request.user.id)) return;

          const answer_index = parseInt(request.customId.split("_")[1]!);

          players_answered.set(request.user.id, answer_index);

          if (players_answered.size >= players_still_in.size) collector.stop();
        });

        collector.on("end", async () => {
          for (const [player_id, _] of players_still_in.entries())
            if (players_answered.get(player_id) != correct_answer_index)
              players_still_in.delete(player_id);

          await this.#interaction.editReply({
            embeds: [
              new CustomEmbed()
                .setTitle(question.question)
                .setFields(
                  {
                    name: "📚 Category",
                    value: question.category,
                    inline: true,
                  },
                  {
                    name: "📈 Difficulty",
                    value: `${Trivia.#DIFFICULTY_DATA.get(question.difficulty)!.emoji} ${question.difficulty}`,
                    inline: true,
                  },
                  {
                    name: "🕑 Game continues",
                    value: `<t:${Math.floor(moment().add(10, "seconds").valueOf() / 1000)}:R>`,
                    inline: true,
                  },
                  {
                    name: "✅ Correct Answer",
                    value:
                      correct_answer_index != -1
                        ? `${String.fromCharCode(
                            "A".charCodeAt(0) + correct_answer_index,
                          )}. ${question.correct_answer}`
                        : "Couldn't fetch the correct answer :(",
                  },
                )
                .setImage("attachment://bg.jpg"),
            ],
            components: [],
            files: [await this.#getCanvasAttachment(players_still_in)],
          });

          await new Promise<void>((res) => {
            setTimeout(() => {
              return res();
            }, 10000);
          });

          return res();
        });
      });

      if (players_still_in.size < 2) break;
    }

    return players_still_in;
  }

  async #handleResults(winners: Map<string, string>) {
    const prize_pool = this.#players.size * this.#bet.amount;

    const prize = winners.size ? Math.floor(prize_pool / winners.size) : 0;

    for (const id of [...Array.from(winners.keys())])
      await addCurrency(id, prize, this.#bet.currency);

    await this.#interaction.editReply({
      content: "",
      embeds: [
        new CustomEmbed()
          .setTitle("Trivia Results")
          .setDescription(`The game has ended. Lets check the results!`)
          .setFields(
            {
              name: "🏆 Winner(s)",
              value:
                winners.size == 0
                  ? "No one :("
                  : Array.from(winners.keys())
                      .map((id) => userMention(id))
                      .join(", "),
              inline: true,
            },
            {
              name: "💸 Prize",
              value:
                winners.size > 0
                  ? `${this.#bet.currency == Currency.COIN ? "🪙" : "💎"} ${prize.toLocaleString()}`.replace(
                      "💎",
                      gem_emoji.embed,
                    )
                  : "Better luck next time!",
              inline: true,
            },
          )
          .setImage("attachment://bg.jpg"),
      ],
      components: [],
    });
  }

  async #createCanvas(still_in_game: Map<string, string>) {
    const background = await loadImage(
      await fs.readFile(path.join(Trivia.#PATH, `${this.#map}.jpg`)),
    );

    const canvas = createCanvas(background.width, background.height);
    const context = canvas.getContext("2d");

    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    for (let i = 0; i < this.#players.size; i++) {
      const player = Array.from(this.#players.entries())[i];

      if (!player) continue;

      const [id, avatar_url] = player;

      const avatar = await loadImage(avatar_url);

      if (!still_in_game.has(id)) context.filter = "grayscale(100%)";

      const { x, y, size, gap } = Trivia.#MAPS.get(this.#map)!;

      context.drawImage(
        avatar,
        x + (i % 4) * (size + gap),
        y + Math.floor(i / 4) * (size + gap),
        size,
        size,
      );
      context.filter = "none";
    }

    return canvas;
  }

  async #getCanvasAttachment(still_in_game: Map<string, string>) {
    const canvas = await this.#createCanvas(still_in_game);

    const attachment_name = "bg.jpg";

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: attachment_name,
    });
  }
}

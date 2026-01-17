import {
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  TextChannel,
  userMention,
} from "discord.js";
import { client } from "../index.js";
import {
  diffInMinutes,
  getRandomFromArray,
  truncateNumber,
} from "../utils/helpers.js";
import { addCoins, getUserCoins, takeCoins } from "../db/prisma.js";
import { CustomEmbed } from "../utils/embed.js";

type QuestionT = {
  question: string;
  allow_decimal: boolean;
  allow_negative: boolean;
};

// https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzl1cWZneGkxMmJoZzdxd2RjNGY1YTZsNHVucmJhdzNxdDY0aDE0eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TVfeiWmO42MLH63ONT/giphy.gif - gif for answers

export class Lottery {
  static ANNOUNCEMENTS_CHANNEL_ID = "1311121693133246535";
  static LOTTERY_CHANNEL_ID = "1459659790417399960";
  static BOT_ANNOUNCMENTS_CHANNEL_ID = "1460722368702976104";
  static COST = 10;

  #question: QuestionT | null;
  #message: Message<boolean> | null;
  #entries: Map<string, number>;

  constructor() {
    this.#question = null;
    this.#message = null;
    this.#entries = new Map();

    client.on("messageCreate", async (message) => {
      if (message.author.id == client.user?.id) return;

      switch (message.channelId) {
        case Lottery.ANNOUNCEMENTS_CHANNEL_ID:
          this.#generateQuestion(message);

          await this.#sendQuestion();

          break;
      }
    });

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      switch (interaction.commandName) {
        case "lottery":
          if (!this.#question || !this.#message) return;

          let value = truncateNumber(
            interaction.options.getNumber("answer", true),
            this.#question.allow_decimal ? 2 : 0,
          );

          value = this.#question.allow_negative ? value : Math.abs(value);

          if (
            diffInMinutes(interaction.createdAt, this.#message.createdAt) > 30
          ) {
            if (interaction.user.id != "609097048662343700") return; // id for me (maybe add a role to let reveal an answer)

            await interaction.reply("Checking results...");

            await this.#postResults(value);

            await interaction.deleteReply();

            return;
          }

          // already entered the lottery
          if (this.#entries.has(interaction.user.id)) return;

          // if ((await getUserCoins(interaction.user.id)) < Lottery.COST) return;

          this.#entries.set(interaction.user.id, value);

          await interaction.reply("Adding you to the lottery...");

          // await takeCoins(interaction.user.id, Lottery.COST);
          await this.#sendQuestion();

          await interaction.deleteReply();

          break;
      }
    });
  }

  #generateQuestion(message: Message<boolean>) {
    const average_or_total: "average" | "total" = getRandomFromArray([
      "average",
      "total",
    ]);

    const default_questions: QuestionT[] = [
      {
        question: `How many ${getRandomFromArray([
          "kills",
          "assists",
          "deaths",
        ])} will ranni get this stream in ${average_or_total}?`,
        allow_decimal: average_or_total == "average",
        allow_negative: false,
      },
      {
        question: "How many times will ranni go negative this stream?",
        allow_decimal: false,
        allow_negative: false,
      },
      {
        question: "What will be ranni's average k/d this stream?",
        allow_decimal: true,
        allow_negative: false,
      },
      {
        question: "What will be today's stream length (in hours)?",
        allow_decimal: true,
        allow_negative: false,
      },
    ];

    const is_swift =
      message.embeds[0]?.title?.toLowerCase().includes("swift") ?? false;

    if (is_swift)
      default_questions.push({
        question:
          "How much RR will ranni gain/lose this stream? (positive number for gaining, negative number for losing)",
        allow_decimal: false,
        allow_negative: true,
      });

    const unique_questions: QuestionT[] = []; // add specific questions for a certain period/stream.

    this.#question = unique_questions.length
      ? getRandomFromArray(unique_questions)
      : getRandomFromArray(default_questions);
  }

  async #sendQuestion() {
    if (!this.#question) return;

    const channel = client.channels.cache.get(
      Lottery.LOTTERY_CHANNEL_ID,
    ) as TextChannel;

    const options: MessageCreateOptions | MessageEditOptions = {
      content: "@everyone",
      embeds: [
        new CustomEmbed()
          .setTitle(this.#question.question)
          .setDescription(
            "Closest answer will get the entire prize pool!\nUse /lottery and have a chance to win it all!\n\n(If ur interaction gets deleted, you were added successfully to the lottery)",
          )
          .setFields(
            {
              name: "👤 Participants",
              value:
                (this.#entries.size
                  ? Array.from(this.#entries.keys())
                      .map((entry) => userMention(entry))
                      .join(" ")
                  : "No participants yet") + "\n\u200b",
            },
            {
              name: "🏆 Prize Pool",
              value: `- 🪙 ${this.#calcPrizePool()}`,
              inline: true,
            },
            {
              name: "❌ Interaction will fail if",
              value: `- 10 minutes have passed\n- You already entered the lottery\n - You dont have ${Lottery.COST} coins`,
              inline: true,
            },
            {
              name: "🔄 Answer Tweaks",
              value: `${
                this.#question.allow_decimal
                  ? "- Decimal numbers are allowed\n"
                  : "- Numbers after the decimal point will be ignored\n"
              } ${
                this.#question.allow_negative
                  ? "- Negative answers are allowed"
                  : "- Negative numbers will be considered positive"
              }`,
            },
          )
          .setColor(0xeb3455)
          .setImage(
            "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMm9zdGU2eDNlMGZ0aTI4OXhqMGFtOGQwYjYzNDA2am01NzdleHNtZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT5LMHqCUIUtXyau7C/giphy.gif",
          ),
      ],
    };

    if (!this.#message)
      this.#message = await channel.send(options as MessageCreateOptions);
    else this.#message.edit(options as MessageEditOptions);
  }

  #calcPrizePool() {
    return this.#entries.size * Lottery.COST;
  }

  async #postResults(correct_answer: number) {
    const sorted_by_closest = Array.from(this.#entries.entries())
      .map(([id, answer]) => ({
        id,
        answer,
        diff: Math.abs(answer - correct_answer),
      }))
      .sort((a, b) => a.diff - b.diff);

    const winners: Map<string, number> = new Map();

    for (const user of sorted_by_closest) {
      if (user.diff != sorted_by_closest[0]?.diff) break;

      winners.set(user.id, user.answer);
    }

    const prize_for_each_winner = Math.ceil(
      this.#calcPrizePool() / winners.size,
    );

    for (const user_id of Array.from(winners.keys())) {
      await addCoins(user_id, prize_for_each_winner);
      this.#entries.delete(user_id);
    }

    if (winners.size) {
      await (this.#message?.channel as TextChannel).send({
        embeds: [
          new CustomEmbed()
            .setTitle("🤩 LOTTERY RESULTS 🤩")
            .setFields([
              {
                name: "❓ Question",
                value: ` - ${this.#question!.question}`,
              },
              {
                name: "✅ Correct Answer",
                value: ` - ${correct_answer}`,
                inline: true,
              },
              {
                name: "🎖️ Winners",
                value: winners.size
                  ? Array.from(winners.entries())
                      .map(
                        ([id, answer]) =>
                          `- ${userMention(
                            id,
                          )}: ${answer} (🪙 +${prize_for_each_winner})`,
                      )
                      .join("\n")
                  : "No one entered the lottery :(",
                inline: true,
              },
              {
                name: "😔 Losers",
                value: Array.from(this.#entries.entries())
                  .map(([id, answer]) => `${userMention(id)} (${answer})`)
                  .join(", "),
              },
            ])
            .setColor(0xeb3455)
            .setImage(
              "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGw5cWVjZW9pczR2dTlhaml5MTJwNjhtOW45azlqNGJkMmd1aWRzdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3orif2Ux6bGxvgEGtO/giphy.gif",
            ),
        ],
      });

      await this.#message?.delete();
    }

    this.#question = null;
    this.#message = null;
    this.#entries = new Map();
  }
}

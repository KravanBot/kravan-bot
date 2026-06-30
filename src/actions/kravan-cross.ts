import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
} from "discord.js";
import { addCoins, getUserCoins, takeCoins } from "../db/prisma.js";
import { CustomEmbed } from "../utils/embed.js";
import moment from "moment";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs/promises";
import path from "path";

enum GameResult {
  WIN,
  LOSE,
  CONTINUE,
}

export class KravanCross {
  static #MULTIPLIERS = [1, 1.25, 1.5, 2, 2.25, 2.5, 3, 3.5, 4, 5];
  static #NUM_OF_STEPS = KravanCross.#MULTIPLIERS.length;
  static #PATH = "./assets/kravan-cross";
  static #SCALE = 6;

  #bet: number;
  #multiplier: number;
  #interaction: ChatInputCommandInteraction<CacheType>;

  constructor(interaction: ChatInputCommandInteraction<CacheType>) {
    this.#multiplier = 1;
    this.#bet = 0;
    this.#interaction = interaction;

    (async () => {
      this.#multiplier = 1;

      if (!interaction.replied) await interaction.deferReply();

      this.#bet = Math.floor(interaction.options.getNumber("bet", true));

      if (!(await this.#canGamble())) return;

      await takeCoins(interaction.user.id, this.#bet);

      const result: GameResult = await this.#handleGame();

      if (result == GameResult.WIN) {
        await addCoins(
          interaction.user.id,
          Math.floor(this.#bet * this.#multiplier),
        );

        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setDescription(
                `Nice! You cashed out with <a:goldencoin:1311863385922736148> ${Math.floor(this.#bet * this.#multiplier)} coins!`,
              )
              .setColor(0x4c65f5)
              .setImage(
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ25lNXlrM2VqaTBrZGprNTZmdDR4OHFnZDd4dDdwdWs4ZTJpdG9rdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PEdNeb9cvC1ZS/giphy.gif",
              ),
          ],
          components: [],
          files: [],
        });
      } else {
        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setDescription("Type greed they talk about in the bible 🙄")
              .setColor(0xf5223e)
              .setImage(
                "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGI5eDYxM3hsdjgwb3l3YTBhbHBjYmFkMHh0NHQ1cTdnaTR6aTV5YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vvwYS15WrMq7S/giphy.gif",
              ),
          ],
          components: [],
          files: [],
        });
      }
    })();
  }

  async #canGamble() {
    const balance = await getUserCoins(this.#interaction.user.id);

    this.#bet = Math.min(balance.coins, this.#bet);

    if (this.#bet <= 0) {
      await this.#interaction.editReply({
        content: "U A BROKE MF",
        embeds: [],
        components: [],
        files: [],
      });
      return false;
    }

    return true;
  }

  async #handleGame() {
    for (let i = 0; i < KravanCross.#NUM_OF_STEPS; i++) {
      this.#multiplier = KravanCross.#MULTIPLIERS[i]!;

      const res = await new Promise<GameResult>(async (res) => {
        const components = [
          new ButtonBuilder()
            .setCustomId("step")
            .setLabel("➡️ Step")
            .setStyle(ButtonStyle.Secondary),
        ];

        if (i > 0)
          components.push(
            new ButtonBuilder()
              .setCustomId("cash-out")
              .setLabel("💸 Cash Out")
              .setStyle(ButtonStyle.Success),
          );

        const canvas = await this.#getCanvas(i);

        const msg = await this.#interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setDescription(
                `\`Multiplier: x${this.#multiplier}\`\n\`Current Reward:\` <a:goldencoin:1311863385922736148> ${Math.floor(this.#bet * this.#multiplier).toLocaleString()}\n\nChoose <t:${Math.floor(moment().utc().add(1, "minutes").valueOf() / 1000)}:R>, or default behavior will be cash out`,
              )
              .setColor(0x93e5f6)
              .setImage("attachment://img.jpg"),
          ],
          files: [
            new AttachmentBuilder(canvas.toBuffer("image/png"), {
              name: "img.jpg",
            }),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(components),
          ],
        });

        const collector = msg.createMessageComponentCollector({
          time: 60_000,
          filter: (interaction) =>
            interaction.user.id == this.#interaction.user.id,
        });

        collector.on("collect", async (interaction) => {
          switch (interaction.customId) {
            case "cash-out":
              await interaction.deferUpdate();
              collector.stop("chose");

              return res(GameResult.WIN);

            case "step":
              await interaction.deferUpdate();
              collector.stop("chose");

              if (Math.floor(Math.random() * 4) == 0)
                return res(GameResult.LOSE);

              return res(GameResult.CONTINUE);
          }
        });

        collector.on("end", async (_, reason) => {
          if (reason != "time") return;

          return res(GameResult.WIN);
        });
      });

      if (res != GameResult.CONTINUE) return res;
    }

    return GameResult.WIN;
  }

  async #getCanvas(current_cloud: number) {
    const bg = await loadImage(
      await fs.readFile(path.join(KravanCross.#PATH, "bg.png")),
    );
    const cloud = await loadImage(
      await fs.readFile(path.join(KravanCross.#PATH, "cloud.png")),
    );
    const kravan = await loadImage(
      await fs.readFile(path.join(KravanCross.#PATH, "kravan.png")),
    );

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    for (let i = 0; i < KravanCross.#NUM_OF_STEPS; i++) {
      const x = KravanCross.#SCALE + (cloud.width + 2 * KravanCross.#SCALE) * i;
      const y = 62 * KravanCross.#SCALE;

      ctx.drawImage(cloud, x, y);

      if (i == current_cloud)
        ctx.drawImage(
          kravan,
          x + 2 * KravanCross.#SCALE,
          y - 2 * KravanCross.#SCALE,
        );
    }

    return canvas;
  }
}

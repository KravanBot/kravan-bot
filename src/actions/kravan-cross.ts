import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
} from "discord.js";
import { addCoins, getUserCoins, takeCoins } from "../db/prisma.js";
import { CustomEmbed } from "../utils/embed.js";

enum GameResult {
  WIN,
  LOSE,
  CONTINUE,
}

export class KravanCross {
  static #NUM_OF_STEPS = 10;

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
          interaction.id,
          Math.floor(this.#bet * this.#multiplier),
        );

        await this.#cashOut();
      } else {
        await interaction.editReply({
          embeds: [new CustomEmbed().setDescription("LOSE")],
          components: [],
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

        const msg = await this.#interaction.editReply({
          embeds: [
            new CustomEmbed().setDescription(
              `\`Multiplier: x${this.#multiplier}\`\n\`Current Reward:\` <a:goldencoin:1311863385922736148> ${Math.floor(this.#bet * this.#multiplier).toLocaleString()}\n\nChoose <t:R>, or default behavior will be cash out`,
            ),
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
              await interaction.deferReply();

              return res(GameResult.WIN);

            case "step":
              await interaction.deferReply();

              if (Math.floor(Math.random() * 2) == 0)
                return res(GameResult.LOSE);

              this.#multiplier += 0.5;

              return res(GameResult.CONTINUE);
          }

          collector.stop("chose");
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

  async #cashOut() {
    await this.#interaction.editReply({
      embeds: [
        new CustomEmbed().setDescription(
          `Nice! You cashed out with <a:goldencoin:1311863385922736148> ${Math.floor(this.#bet * this.#multiplier)} coins!`,
        ),
      ],
      components: [],
    });
  }
}

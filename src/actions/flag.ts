import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ComponentType,
  InteractionCollector,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getFlagNameVariants, getRandomFromArray } from "../utils/helpers.js";
import { flags } from "../utils/constants.js";
import { CustomEmbed } from "../utils/embed.js";
import moment from "moment";
import { addCoins } from "../db/prisma.js";

export class Flag {
  static #flag_collectors: Map<
    string,
    InteractionCollector<ButtonInteraction<CacheType>>
  > = new Map();

  static async handleNewFlag(
    interaction:
      | ChatInputCommandInteraction<CacheType>
      | ButtonInteraction<CacheType>,
  ) {
    const slug = getRandomFromArray(Object.keys(flags))!;

    const embed = new CustomEmbed()
      .setTitle("GUESS THE FLAG")
      .setDescription(
        `Time will expire <t:${Math.floor(moment().utc().add(30, "seconds").valueOf() / 1000)}:R>`,
      )
      .setImage(`https://flagcdn.com/h240/${slug}.png`)
      .setColor(0x80e310);

    const data = {
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`flag-${interaction.user.id}-${slug}`)
            .setLabel("Guess!")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`flag-${interaction.user.id}-skip`)
            .setLabel("Skip")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`flag-${interaction.user.id}-${slug}-reveal`)
            .setLabel("Reveal first letter")
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    };

    let msg;

    if (interaction instanceof ButtonInteraction)
      msg = await interaction.message.edit(data);
    else msg = await interaction.reply({ ...data, fetchReply: true });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          buttonInteraction.reply({
            content: "This button isn't for u dummy",
            ephemeral: true,
          });
          return false;
        }
        return true;
      },
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId.includes("reveal")) {
        await interaction.message.edit({
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              ...(
                interaction.message.components[0] as ActionRow<ButtonComponent>
              ).components
                .toSpliced(2, 1)
                .map((button) => new ButtonBuilder(button.data)),
            ),
          ],
        });

        await interaction.reply({
          content: `The first letter is: ${getFlagNameVariants(flags[slug]!)[0]!.charAt(0)}`,
          ephemeral: true,
        });

        return;
      }

      if (interaction.customId.includes("skip")) {
        await interaction.deferUpdate();

        collector.stop("skipped");

        Flag.handleNewFlag(interaction);

        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`flag-${slug}`)
        .setTitle("GUESS THE FLAG");

      const text_input = new TextInputBuilder()
        .setCustomId("flag-answer")
        .setLabel("What flag is shown?")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Enter your answer here...")
        .setMinLength(4)
        .setMaxLength(60)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(text_input),
      );

      await interaction.showModal(modal);
    });

    collector.on("end", async (_, reason) => {
      Flag.#flag_collectors.delete(msg.id);

      if (reason == "skipped" || reason == "answered") return;

      await msg.edit({
        embeds: [
          new CustomEmbed()
            .setTitle(`Time expired 😵‍💫`)
            .setImage(embed.data.image!.url)
            .setColor(embed.data.color!),
        ],
        components: [],
      });
    });

    Flag.#flag_collectors.set(msg.id, collector);
  }

  static async handleFlagSubmit(
    interaction: ModalSubmitInteraction<CacheType>,
  ) {
    const [_, ...slug_parts] = interaction.customId.split("-");
    const slug = slug_parts.join("-");
    const result = flags[slug];

    if (!result) return;

    const formatAnswer = (answer: string) => {
      const special_chars: Record<string, string> = {
        å: "a",
        ô: "o",
        ç: "c",
        é: "e",
        ã: "a",
        í: "i",
      };

      return answer
        .replace(/[åôçéãí]/g, (char) => special_chars[char] ?? char)
        .toLowerCase();
    };

    const valid_answers = getFlagNameVariants(result).map(formatAnswer);

    const answer = formatAnswer(
      interaction.fields.getTextInputValue("flag-answer"),
    );

    const is_right = valid_answers.includes(answer);

    if (interaction.message!.components.length <= 0)
      return await interaction.reply({
        content: "Time already expired 😵‍💫",
        ephemeral: true,
      });

    if (is_right) {
      Flag.#flag_collectors.get(interaction.message!.id)?.stop("answered");

      const embed = interaction.message!.embeds[0]!;

      await addCoins(interaction.user.id, 10);

      await interaction.message?.edit({
        embeds: [
          new CustomEmbed()
            .setTitle(`Nice! You guessed correctly 🤩`)
            .setImage(embed.image!.url)
            .setColor(embed.color),
        ],
        components: [],
      });
    }

    await interaction.reply({
      content: is_right ? "Nice!! You got 🪙 10 coins" : "No dummy 🫨",
      ephemeral: true,
    });
  }
}

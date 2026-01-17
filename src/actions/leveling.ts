import { ComponentType, userMention } from "discord.js";
import { addCoins } from "../db/prisma.js";
import { client } from "../index.js";

export class Leveling {
  static #CHANNEL_ID = "1236751656897478689";
  static #BOT_ID = "534589798267224065";

  constructor() {
    client.on("messageCreate", async (message) => {
      if (
        message.channelId != Leveling.#CHANNEL_ID ||
        message.author.id != Leveling.#BOT_ID ||
        message.interactionMetadata
      )
        return;

      let title_component = message.components.at(0);

      if (title_component?.type != ComponentType.Container) return;

      title_component = title_component.components[0];

      if (title_component?.type != ComponentType.Section) return;

      const title_content = title_component.components.at(0)?.content;

      if (!title_content) return;

      const new_level = parseInt(title_content.split(">").at(-1) ?? "");

      if (isNaN(new_level)) return;

      const target_id = message.mentions.users.at(0)!.id;
      const reward = Math.max(Math.floor((new_level * 3) / 10), 1);

      await addCoins(target_id, reward);

      await message.reply(
        `Nice! u got +${reward} coins 🪙 (go gamble what r u waiting for)`
      );
    });
  }
}

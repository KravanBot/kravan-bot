import { ComponentType, Message, OmitPartialGroupDMChannel } from "discord.js";
import { addCoins, addGems } from "../db/prisma.js";
import { validateNotInJail } from "../utils/helpers.js";
import { Currency } from "./store.js";
import { gem_emoji } from "../index.js";

export class Leveling {
  static CHANNEL_ID = "1236751656897478689";
  static BOT_ID = "534589798267224065";

  static async handleMessage(
    message: OmitPartialGroupDMChannel<Message<boolean>>,
  ) {
    let title_component = message.components.at(0);

    if (title_component?.type != ComponentType.Container) return;

    title_component = title_component.components[0];

    if (title_component?.type != ComponentType.Section) return;

    const title_content = title_component.components.at(0)?.content;

    if (!title_content) return;

    const new_level = parseInt(title_content.split(">").at(-1) ?? "");

    if (isNaN(new_level)) return;

    const target_id = message.mentions.users.at(0)!.id;
    const reward =
      new_level == 50
        ? { type: Currency.GEM, amount: 5 }
        : {
            type: Currency.COIN,
            amount: Math.max(Math.floor((new_level * 3) / 10), 1),
          };

    await validateNotInJail(target_id);

    if (reward.type == Currency.COIN) await addCoins(target_id, reward.amount);
    else await addGems(target_id, reward.amount);

    await message.reply(
      `Nice! u got +${reward.amount} ${reward.type == Currency.COIN ? "coins 🪙" : "gems 💎"} (go gamble what r u waiting for)`.replaceAll(
        "💎",
        gem_emoji.message,
      ),
    );
  }
}

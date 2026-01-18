import { CustomEmbed } from "../utils/embed.js";

export enum ItemId {
  ALARM = 1,
}
export class Store {
  static ITEMS: Record<
    number,
    {
      name: string;
      description: string;
      amount: number;
    }
  > = {
    [ItemId.ALARM]: {
      name: "🚨 Alarm",
      description:
        "Get an alarm the next time someone tries to steal from you (works for only 1 steal opportunity)",
      amount: 15,
    },
  };

  static getStoreEmbed() {
    return new CustomEmbed()
      .setTitle("SHOP 🛍️")
      .setColor(0x8f34eb)
      .setDescription("Buy cool stuff here lol")
      .setFields(
        Object.entries(this.ITEMS).map(([id, item]) => ({
          name: `${id}) ${item.name} (🪙 ${item.amount})`,
          value: `- ${item.description}`,
          inline: true,
        })),
      );
  }
}

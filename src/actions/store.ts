import { CustomEmbed } from "../utils/embed.js";

export enum ItemId {
  ALARM = 1,
  BOUQUET,
  SHIELD_1,
  SHIELD_2,
  SHIELD_3,
  SHIELD_4,
  SHIELD_5,
  SHIELD_6,
  SHIELD_7,
  SHIELD_8,
  SHIELD_9,
  SHIELD_10,
}

export class Store {
  static ITEMS = new Map<
    number,
    {
      name: string;
      description: string;
      amount: number;
    }
  >()
    .set(ItemId.ALARM, {
      name: "🚨 Alarm",
      description:
        "Get an alarm the next time someone tries to steal from you (works for only 1 steal opportunity)",
      amount: 15,
    })
    .set(ItemId.BOUQUET, {
      name: "💐 Bouquet",
      description:
        "Buy a bouquet of flowers (u can also give it to a special someone 🤗)",
      amount: 100,
    });

  static getStoreEmbed() {
    return new CustomEmbed().setColor(0x8f34eb).setFields(
      Object.entries(this.ITEMS).map(([_, item]) => ({
        name: `${item.name} (🪙 ${item.amount.toLocaleString()})`,
        value: `- ${item.description}`,
        inline: true,
      })),
    );
  }
}

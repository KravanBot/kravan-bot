import { gem_emoji } from "../index.js";
import { CustomEmbed } from "../utils/embed.js";

export enum ItemId {
  ALARM,
  BOUQUET,
  DIAMOND,
  START_SHIRTS,
  BUBI,
  KRAVAN_HEART,
  PONGO,
}

enum Currency {
  COIN,
  GEM,
}

export class Store {
  static ITEMS = new Map<
    number,
    {
      name: string;
      description: string;
      amount: number;
      currency: Currency;
    }
  >()
    .set(ItemId.ALARM, {
      name: "🚨 Alarm",
      description:
        "Get an alarm the next time someone tries to steal from you (works for only 1 steal opportunity)",
      amount: 100,
      currency: Currency.COIN,
    })
    .set(ItemId.BOUQUET, {
      name: "💐 Bouquet",
      description:
        "Buy a bouquet of flowers (u can also give it to a special someone 🤗)",
      amount: 100,
      currency: Currency.COIN,
    })
    .set(ItemId.DIAMOND, {
      name: "💎 Gem",
      description: "Get a shiny diamond",
      amount: 100_000_000,
      currency: Currency.COIN,
    })
    .set(ItemId.BUBI, {
      name: "🐶 Bubi",
      description: "Teru's weird named dog",
      amount: 10,
      currency: Currency.GEM,
    })
    .set(ItemId.KRAVAN_HEART, {
      name: "💗 Kravan Heart",
      description: "Pretty self explanatory",
      amount: 10,
      currency: Currency.GEM,
    })
    .set(ItemId.PONGO, {
      name: "😸 Pongo",
      description: "Beanie's street cat",
      amount: 10,
      currency: Currency.GEM,
    });

  static getStoreEmbed() {
    return new CustomEmbed()
      .setDescription("Items/Perks that u can use (and give)")
      .setColor(0x8f34eb)
      .setFields(
        Array.from(this.ITEMS.values()).map((item) => ({
          name: `${item.name} (${item.currency == Currency.COIN ? "🪙" : "💎"} ${item.amount.toLocaleString()})`.replaceAll(
            "💎",
            gem_emoji.embed,
          ),
          value: `${item.description}`,
          inline: true,
        })),
      );
  }
}

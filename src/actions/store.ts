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

  START_PANTS,
  JEANS,
  LEAF,

  START_SHOES,
  RED_SNEAKERS,

  COUNT,
}

export enum Currency {
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
    } | null
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
    .set(ItemId.START_SHIRTS, null)
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
    })
    .set(ItemId.START_PANTS, null)
    .set(ItemId.JEANS, {
      name: "👖 Jeans",
      description: "A basic pair of jeans",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.LEAF, {
      name: "🍀 Leaf",
      description: "To cover the good parts",
      amount: 2,
      currency: Currency.GEM,
    })
    .set(ItemId.START_SHOES, null)
    .set(ItemId.RED_SNEAKERS, {
      name: "👟 Red Sneakers",
      description: "Basic red sneakers",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.COUNT, null);

  static getStoreEmbeds() {
    const values = Array.from(this.ITEMS.values());
    const convertToFields = (arr: typeof values) =>
      arr.map((item) => ({
        name: `${item!.name} (${item!.currency == Currency.COIN ? "🪙" : "💎"} ${item!.amount.toLocaleString()})`.replaceAll(
          "💎",
          gem_emoji.embed,
        ),
        value: `${item!.description}`,
        inline: true,
      }));

    return [
      new CustomEmbed()
        .setDescription("Items/Perks that u can use (and give)")
        .setColor(0x8f34eb)
        .setFields(convertToFields(values.slice(0, ItemId.START_SHIRTS))),

      new CustomEmbed()
        .setDescription("Drip your mini-me with a shirt")
        .setColor(0x34c6eb)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_SHIRTS + 1, ItemId.START_PANTS),
          ),
        ),

      new CustomEmbed()
        .setDescription("Drip your mini-me with some pants")
        .setColor(0xabff24)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_PANTS + 1, ItemId.START_SHOES),
          ),
        ),

      new CustomEmbed()
        .setDescription("One two buckle your mini-me's shoes")
        .setColor(0xff3324)
        .setFields(
          convertToFields(values.slice(ItemId.START_SHOES + 1, ItemId.COUNT)),
        ),
    ];
  }

  static getItemType(item: number) {
    let type = "";
    let result = 0;

    if (item > ItemId.START_PANTS) {
      type = "pants";
      result = ItemId.START_PANTS;
    } else if (item > ItemId.START_SHIRTS) {
      type = "shirt";
      result = ItemId.START_SHIRTS;
    }

    return {
      type,
      item_offset: item - result,
    };
  }
}

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
  PISS_ON_GOOBIE,

  START_PANTS,
  JEANS,
  LEAF,

  START_SHOES,
  RED_SNEAKERS,

  START_WIGS,
  MILES_MORALES,
  SOKKA,
  JANE_PORTER,
  TANGLED,

  START_HATS,
  PROPELLER,
  SPROUT,
  PIKACHU,

  START_EXPRESSION,
  BOTOX_LIPS,

  START_BRACELET,
  SNAKE,

  START_MASK,
  KRAVAN,

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
    .set(ItemId.PISS_ON_GOOBIE, {
      name: "💦 Piss on goobie",
      description: "Best shirt here fr",
      amount: 5,
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
    .set(ItemId.START_WIGS, null)
    .set(ItemId.MILES_MORALES, {
      name: "🕷️ Miles Morales",
      description: "I mean who wouldnt want to be him",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.SOKKA, {
      name: "🧊 Sokka",
      description: "Without the bun tho",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.JANE_PORTER, {
      name: "🟫 Jane Porter",
      description: "Basically long brown hair",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.TANGLED, {
      name: "🟨 Tangled",
      description: "Ok maybe not as long as Rapunzel's",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.START_HATS, null)
    .set(ItemId.PROPELLER, {
      name: "🌀 Propeller",
      description: "U might reach the sky with it",
      amount: 5,
      currency: Currency.GEM,
    })
    .set(ItemId.SPROUT, {
      name: "🌱 Sprout",
      description: "A sprout coming out yo huge head",
      amount: 2,
      currency: Currency.GEM,
    })
    .set(ItemId.PIKACHU, {
      name: "⚡ Pikachu",
      description: "SO CUTE CMON BUY BUY",
      amount: 10,
      currency: Currency.GEM,
    })
    .set(ItemId.START_EXPRESSION, null)
    .set(ItemId.BOTOX_LIPS, {
      name: "👄 Botox Lips",
      description: "Be careful with those...",
      amount: 2,
      currency: Currency.GEM,
    })
    .set(ItemId.START_BRACELET, null)
    .set(ItemId.SNAKE, {
      name: "🐍 Snake",
      description: "U know what to do with those",
      amount: 50,
      currency: Currency.GEM,
    })
    .set(ItemId.START_MASK, null)
    .set(ItemId.KRAVAN, {
      name: "🐦‍⬛ Kravan",
      description: "A kravan mask",
      amount: 100,
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
        .setColor(0xf5c63b)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_SHOES + 1, ItemId.START_WIGS),
          ),
        ),

      new CustomEmbed()
        .setDescription("Put a wig on your mini-me u dont want it to be bald")
        .setColor(0xfc7830)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_WIGS + 1, ItemId.START_HATS),
          ),
        ),

      new CustomEmbed()
        .setDescription("A cute hat/topper for your mini-me")
        .setColor(0xff443d)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_HATS + 1, ItemId.START_EXPRESSION),
          ),
        ),

      new CustomEmbed()
        .setDescription("Add your mini-me an expression")
        .setColor(0xff3665)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_EXPRESSION + 1, ItemId.START_BRACELET),
          ),
        ),

      new CustomEmbed()
        .setDescription("Wear something on your hand")
        .setColor(0xff6ed3)
        .setFields(
          convertToFields(
            values.slice(ItemId.START_BRACELET + 1, ItemId.START_MASK),
          ),
        ),

      new CustomEmbed()
        .setDescription("Hide your mini-me's ugly ahh face with a mask")
        .setColor(0xff78fd)
        .setFields(
          convertToFields(values.slice(ItemId.START_MASK + 1, ItemId.COUNT)),
        ),
    ];
  }

  static getItemType(item: number) {
    let type = "";
    let result = 0;

    if (item > ItemId.START_MASK) {
      type = "mask";
      result = ItemId.START_MASK;
    } else if (item > ItemId.START_BRACELET) {
      type = "bracelet";
      result = ItemId.START_BRACELET;
    } else if (item > ItemId.START_EXPRESSION) {
      type = "expression";
      result = ItemId.START_EXPRESSION;
    } else if (item > ItemId.START_HATS) {
      type = "hat";
      result = ItemId.START_HATS;
    } else if (item > ItemId.START_WIGS) {
      type = "wig";
      result = ItemId.START_WIGS;
    } else if (item > ItemId.START_SHOES) {
      type = "shoes";
      result = ItemId.START_SHOES;
    } else if (item > ItemId.START_PANTS) {
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

import { ranni_guild } from "../index.js";
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

  START_EXPRESSION,
  BOTOX_LIPS,

  START_BRACELET,
  SNAKE,

  START_MASK,
  KRAVAN,
  END_MASK,

  PIKACHU,
  GAMBLING_BOOST_15M,
  GAMBLING_BOOST_30M,

  BEER,
  KEBAB,
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
    .set(ItemId.GAMBLING_BOOST_15M, {
      name: "🚀 Boost",
      description: "a 10% gambling boost for 15 minutes",
      amount: 100,
      currency: Currency.GEM,
    })
    .set(ItemId.GAMBLING_BOOST_30M, {
      name: "☄️ Big Boost",
      description: "a 10% gambling boost for 30 minutes",
      amount: 175,
      currency: Currency.GEM,
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
    .set(ItemId.END_MASK, null)
    .set(ItemId.BEER, {
      name: "🍺 Beer",
      description: "A good cup of bear",
      amount: 100,
      currency: Currency.COIN,
    })
    .set(ItemId.KEBAB, {
      name: "🥙 Kebab",
      description: "A nice kebab meal",
      amount: 100,
      currency: Currency.COIN,
    });

  static getStoreEmbeds() {
    const convertToDescription = (description: string, arr: ItemId[]) => {
      const longest_name = arr.reduce((a: number, b: ItemId) => {
        const [_, ...name] = Store.ITEMS.get(b)!.name.split(" ");

        return a > (name.join(" ").length ?? 0) ? a : b;
      }, 0);

      return [
        description,
        ...arr.map((id) => {
          const item = this.ITEMS.get(id)!;

          return `**${item!.name.padEnd(longest_name + 2, "ㅤ")}**${item!.currency == Currency.COIN ? "🪙" : "💎"}\`${item!.amount.toLocaleString()}\`\n${item.description}`.replaceAll(
            "💎",
            ranni_guild.emojis?.gem.embed ?? "💎",
          );
        }),
      ].join("\n\u200b\n\u200b");
    };

    return [
      new CustomEmbed()
        .setDescription(
          convertToDescription("Items/Perks that u can use (and give)", [
            ItemId.ALARM,
            ItemId.BOUQUET,
            ItemId.DIAMOND,
            ItemId.GAMBLING_BOOST_15M,
            ItemId.GAMBLING_BOOST_30M,
          ]),
        )
        .setColor(0x8f34eb),

      new CustomEmbed()
        .setDescription(
          convertToDescription("Drip your mini-me with a shirt", [
            ItemId.BUBI,
            ItemId.KRAVAN_HEART,
            ItemId.PONGO,
            ItemId.PISS_ON_GOOBIE,
          ]),
        )
        .setColor(0x34c6eb),

      new CustomEmbed()
        .setDescription(
          convertToDescription("Drip your mini-me with some pants", [
            ItemId.JEANS,
            ItemId.LEAF,
          ]),
        )
        .setColor(0xabff24),

      new CustomEmbed()
        .setDescription(
          convertToDescription("One two buckle your mini-me's shoes", [
            ItemId.RED_SNEAKERS,
          ]),
        )
        .setColor(0xf5c63b),

      new CustomEmbed()
        .setDescription(
          convertToDescription(
            "Put a wig on your mini-me u dont want it to be bald",
            [
              ItemId.MILES_MORALES,
              ItemId.SOKKA,
              ItemId.JANE_PORTER,
              ItemId.TANGLED,
            ],
          ),
        )
        .setColor(0xfc7830),

      new CustomEmbed()
        .setDescription(
          convertToDescription("A cute hat/topper for your mini-me", [
            ItemId.PROPELLER,
            ItemId.SPROUT,
            ItemId.PIKACHU,
          ]),
        )
        .setColor(0xff443d),

      new CustomEmbed()
        .setDescription(
          convertToDescription("Add your mini-me an expression", [
            ItemId.BOTOX_LIPS,
          ]),
        )
        .setColor(0xff3665),

      new CustomEmbed()
        .setDescription(
          convertToDescription("Wear something on your hand", [ItemId.SNAKE]),
        )
        .setColor(0xff6ed3),

      new CustomEmbed()
        .setDescription(
          convertToDescription(
            "Hide your mini-me's ugly ahh face with a mask",
            [ItemId.KRAVAN],
          ),
        )
        .setColor(0xff78fd),
    ];
  }

  static getItemType(item: number) {
    let type = "";
    let result = 0;

    const keys = Array.from(this.ITEMS.keys());
    const values = Array.from(this.ITEMS.values());

    item = keys.indexOf(item);

    for (result = item; result >= 0 && !!values.at(result); result--) {}

    const type_index = keys.at(result);

    if (type_index == ItemId.START_MASK) type = "mask";
    else if (type_index == ItemId.START_BRACELET) type = "bracelet";
    else if (type_index == ItemId.START_EXPRESSION) type = "expression";
    else if (type_index == ItemId.START_HATS) type = "hat";
    else if (type_index == ItemId.START_WIGS) type = "wig";
    else if (type_index == ItemId.START_SHOES) type = "shoes";
    else if (type_index == ItemId.START_PANTS) type = "pants";
    else if (type_index == ItemId.START_SHIRTS) type = "shirt";

    return {
      type,
      item_offset: item - result,
    };
  }
}

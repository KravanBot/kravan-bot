import { userMention } from "discord.js";
import { Currency, Store } from "../actions/store.js";
import { CustomEmbed } from "./embed.js";
import { commands_details } from "./commands.js";

import emotes_json from "../constants/emotes.json" with { type: "json" };
import actions_json from "../constants/actions.json" with { type: "json" };
import flags_json from "../constants/flags.json" with { type: "json" };

export const quest_details: Record<
  keyof QuestT,
  | {
      description: string;
      max: number;
      reward: { amount: number; currency: Currency };
    }
  | undefined
> = {
  donate: {
    description: "Donate 50K to someone!",
    max: 1,
    reward: {
      amount: 5_000,
      currency: Currency.COIN,
    },
  },
  meme: {
    description: "Post a meme in <#1310737786843824278>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  meal: {
    description: "Share your meal in <#1393169480984825896>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  pet: {
    description: "Post your pet in <#1310978386688086117>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  gamble: {
    description: "Gamble 25 Times!",
    max: 25,
    reward: {
      amount: 5_000,
      currency: Currency.COIN,
    },
  },
  quote: {
    description: "Share an inspirational quote in <#1387347858835116042>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  highlight: {
    description: "Post your highlight in <#1311104580628647939>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  cringe_name: {
    description: "Share a weird name in <#1388117861658267718>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  art: {
    description: "Show your art skills in <#1310740233117106306>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  song: {
    description: "Share a good song in <#1446229960741228647>",
    max: 1,
    reward: {
      amount: 10_000,
      currency: Currency.COIN,
    },
  },
  count: {
    description: "count 5 times in <#1236751657086484587>",
    max: 5,
    reward: {
      amount: 1_000,
      currency: Currency.COIN,
    },
  },
  of: undefined,
};

export const emotes = emotes_json satisfies EmotesNActionsT;
export const actions = actions_json satisfies EmotesNActionsT;

export const flags: Record<string, string> = flags_json;

export const items_as_string_option = Array.from(Store.ITEMS)
  .filter(([_, data]) => !!data)
  .map(([id, data]) => ({
    name: data!.name,
    value: id.toString(),
  }));

const command_types: {
  title: string;
  description: string;
  color: number;
  categories: Record<
    string,
    (
      | keyof typeof commands_details
      | keyof typeof emotes
      | keyof typeof actions
    )[]
  >;
}[] = [
  {
    title: "Command List 😁",
    description:
      "Here is a list of all commands, followed by a `/`\n\nFor any questions, please tag a <@&1310967646136565770>",
    color: 0x05b2f7,
    categories: {
      "📹 Streaming": ["schedule", "time-table", "social-media"],
      "🎖️ Ranking": ["net-worth", "superiors"],
      "💸 Economy": [
        "daily",
        "donate",
        "deposit",
        "withdraw",
        "store",
        "buy",
        "give",
        "convert",
      ],
      "🎰 Gambling": [
        "gamble",
        "coinflip",
        "steal",
        "fbi",
        "bribe",
        "hide-n-seek",
        "trivia",
        "kravan-cross",
      ],
      "🥳 Fun": [
        "8ball",
        "meme",
        "rate",
        "flame",
        "mini-me",
        "wear",
        "inventory",
        "counting-details",
        "trap",
      ],
      "🫂 Social": ["ship", "uwuify"],
      "😃 Emotes": Object.keys(emotes) as (keyof typeof emotes)[],
      "🎬 Actions": Object.keys(actions) as (keyof typeof actions)[],
    },
  },
];

export const help_embeds = [
  ...command_types.map(({ title, description, color, categories }) =>
    new CustomEmbed()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFields(
        Object.entries(categories).map(([key, value]) => ({
          name: key,
          value: value.map((el) => `\`${el}\``).join(" "),
        })),
      ),
  ),
  new CustomEmbed()
    .setColor(0xf78b31)
    .setTitle("Actions 🛝")
    .setDescription("Kravan actions besides the commands (tecnologia)")
    .setFields([
      {
        name: "Counting 🔢",
        value:
          "- Whenever u count, u get a coin 🪙\n - If a number is trapped, you can count the next number just normally, or count the trapped number again. If you win, you get 20% of the number to ur pocket. If not, the person who trapped gets 20% and you get public humiliation 😔",
      },
      {
        name: "Reverse 🔙",
        value:
          "You must count in reverse order (pretty straight forward u a dummy if u did not understand)\n\u200b",
        inline: true,
      },
      {
        name: "7 Boom 💥",
        value:
          "If the number you want to count has 7 in it or is a multiplier of 7, you MUST write 'boom' and not the actual number\n\u200b",
        inline: true,
      },
      {
        name: "Leveling 🔼",
        value:
          "Whenever you go up a level, you get 10% of the new level straight to ur pocket 💵",
      },
    ]),

  new CustomEmbed()
    .setColor(0xffffff)
    .setTitle("Creators 🃏")
    .setDescription("(aka created the bot furcefully by ranni)")
    .setFields([
      {
        name: "Coder 💻",
        value: `${userMention(
          "609097048662343700",
        )} (yes guys no AI was used pls appreciate me 🥹🙏)`,
      },
      {
        name: "Masterminds 🧠",
        value: `${userMention("1260205513795174434")} ${userMention(
          "609097048662343700",
        )} ${userMention("133282052350017536")}`,
      },
      {
        name: "Contributers ⛏️",
        value: `${userMention("1260205513795174434")} ${userMention(
          "133282052350017536",
        )} ${userMention("617091659758436516")} (basically gambled too much)`,
      },
    ]),
];

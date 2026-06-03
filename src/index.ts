import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Interaction,
  userMention,
  Guild,
  TextChannel,
  User,
  Channel,
  LabelBuilder,
  UserSelectMenuBuilder,
  GuildMember,
  ModalBuilder,
  ActivityType,
  AttachmentBuilder,
  MessageCreateOptions,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
  TextInputComponent,
  TextInputBuilder,
  TextInputStyle,
  ChatInputCommandInteraction,
  CacheType,
  ButtonInteraction,
  ActionRow,
  ButtonComponent,
  InteractionCollector,
} from "discord.js";
import { Counting } from "./actions/counting.js";
import { Duel } from "./actions/duel.js";
import {
  addCoins,
  addGems,
  addItem,
  addToBank,
  claimJackpot,
  clearJail,
  getCanBribeIn,
  getCanStealIn,
  getChecklist,
  getInventory,
  getJackpot,
  getLastBeer,
  getLastKebab,
  getLastSteal,
  getMinime,
  getQuest,
  getTop5Richest,
  getUserCoins,
  hasEnoughCoins,
  hasEnoughGems,
  hasItem,
  isInJail,
  prisma,
  putInJail,
  putOnMinime,
  QuestT,
  setCanBribeIn,
  setCanStealIn,
  setChecklist,
  setLastSteal,
  setQuest,
  takeCoins,
  takeFromBank,
  takeGems,
  updateAndReturnDaily,
  updateTheft,
  useItem,
} from "./db/prisma.js";
import { Gamble } from "./actions/gamble.js";
import { Lottery } from "./actions/lottery.js";
import { CustomEmbed } from "./utils/embed.js";
import { Leveling } from "./actions/leveling.js";
import { configDotenv } from "dotenv";
import { Steal } from "./actions/steal.js";
import { Currency, ItemId, Store } from "./actions/store.js";
import {
  generateSnowflake,
  getFlagNameVariants,
  getRandomFromArray,
  validateNotInJail,
} from "./utils/helpers.js";
import { Meme } from "./actions/meme.js";
import { MiniMe } from "./actions/minime.js";
import { Flame } from "./actions/flame.js";
import moment from "moment";
import { HideAndSeek } from "./actions/hide-n-sick.js";
import { Trivia } from "./actions/trivia.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { GlobalFonts } from "@napi-rs/canvas";
import { Twitch } from "./actions/twitch.js";
import { StreamerBot } from "./actions/streamerbot.js";
import fs from "fs/promises";
import { Logger } from "./actions/logger.js";
import owo from "@zuzak/owo";

type InteractionT = ChatInputCommandInteraction<CacheType>;

GlobalFonts.registerFromPath("./assets/fonts/Inter.ttf", "Inter");

configDotenv();

const STREAM_DAYS = [2, 5, 6];

const TOKEN = process.env.TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const TEST_GUILD_ID = "1455614953548681301"; // Test server
const RANNI_GUILD_ID = "1236751656331509967"; // Ranni server

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});
export let gem_emoji = { message: "💎", embed: "💎" };

export const current_gambles: Set<string> = new Set();
export const pending_clips: Map<string, string> = new Map();

export const quest_details: Record<
  keyof QuestT,
  { description: string; max: number } | undefined
> = {
  donate: { description: "Donate 50K to someone!", max: 1 },
  meme: {
    description: "Post a meme in <#1310737786843824278>",
    max: 1,
  },
  meal: {
    description: "Share your meal in <#1393169480984825896>",
    max: 1,
  },
  pet: {
    description: "Post your pet in <#1310978386688086117>",
    max: 1,
  },
  gamble: { description: "Gamble 25 Times!", max: 25 },
  quote: {
    description: "Share an inspirational quote in <#1387347858835116042>",
    max: 1,
  },
  highlight: {
    description: "Post your highlight in <#1311104580628647939>",
    max: 1,
  },
  cringe_name: {
    description: "Share a weird name in <#1388117861658267718>",
    max: 1,
  },
  art: {
    description: "Show your art skills in <#1310740233117106306>",
    max: 1,
  },
  song: {
    description: "Share a good song in <#1446229960741228647>",
    max: 1,
  },
  count: {
    description: "count 5 times in <#1236751657086484587>",
    max: 5,
  },
  of: undefined,
};

type EmotesNActionsT = Record<
  string,
  {
    urls: string[];
    titles: string[];
  }
>;

const emotes: EmotesNActionsT = {
  blush: {
    urls: [
      "https://giphy.com/gifs/burn-cameo-oFeUVZfiuim9G",
      "https://giphy.com/gifs/big-sky-aborddelimpala-beau-arlen-RXtBu47mtoETFPiwp0",
      "https://giphy.com/gifs/blushing-disney-bird-VVh7txo37uooM",
      "https://giphy.com/gifs/embarrassed-blush-bashful-QavMUNzmD2HPq",
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjFnZjluZTl2ZjI2ejl1aXMxc2c2bzZrdmE3bmVjbDhxeDVydjg3ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QIXDNqdHT6aQw/giphy.gif",
      "https://giphy.com/gifs/julie-audrey-hepburn-making-me-blush-3o85xHtsgzrusUOA8g",
      "https://giphy.com/gifs/yourreactions-eHpWHuEUxHIre",
      "https://giphy.com/gifs/awkward-embarrassed-blushing-FlHuACrCGXkc0",
      "https://giphy.com/gifs/pokemon-pikachu-blush-hgexLu61GFLr2",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aW1kc2pnNzVzMGQ3b3Nwa2NrZjBjZmF4YmxyOHFoZnBxczE1amtoYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/PleihcHr0kbJVD0bNe/giphy.gif",
    ],
    titles: [
      "{name} blushed!!",
      "{name} is blushing!",
      "{name}'s face is red~",
      "{name} has turned into a tomato.",
    ],
  },
  cry: {
    urls: [
      "https://giphy.com/gifs/the-office-michael-heartbreak-pynZagVcYxVUk",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm9pc3p6OGk0eTlnN3Y0cncxNXduY2k5eXpmMDBtem9qMWhyeG81YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VNTMx3LkpG2anXpwbr/giphy.gif",
      "https://giphy.com/gifs/meme-your-image-mMx7HsHn2l6iQ",
      "https://giphy.com/gifs/spongebob-season-4-spongebob-squarepants-l1AsyjZ8XLd1V7pUk",
      "https://giphy.com/gifs/sad-crying-depressed-fOQs20FLdvINW",
      "https://giphy.com/gifs/disappointed-standing-in-the-rain-Jq7y34Hgfy01y",
      "https://giphy.com/gifs/pout-pouting-poutting-IT8d252aTz13G",
      "https://giphy.com/gifs/wViS9n0RqN2",
      "https://giphy.com/gifs/Zjl3YIB8vXtKg",
    ],
    titles: [
      "{name} is crying... :c",
      "{name} needs a hug...",
      "{name} is crying... there there...",
      "{name} cries... :'c",
    ],
  },
  dance: {
    urls: [
      "https://giphy.com/gifs/nounish-dao-nouns-noggles-tlawNnswcTAmGjKRHQ",
      "https://giphy.com/gifs/page-skills-M5fX8pw9QYBYA",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnhhMW5jYzg0a3V3aXRsaWg0aml3MTNwb3E4YzdkYXI0ZTRsdmpiayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FbiL9rsmZN3ib2JSGo/giphy.gif",
      "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2UzMmdvczJ4ajJ5MjRsMDU2dXd0OXNydWdiY3ljNjFocThhcW10MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/etOX3h7ApZuDe7Fc5w/giphy.gif",
      "https://giphy.com/gifs/collin-dancing-tupac-2pac-MJs7EYwHyG8XC",
      "https://giphy.com/gifs/soultrain-dancing-soul-train-3ohjVazBFR12PCzk3e",
      "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNDUyajA3cWpncnE1MXYwc3E3ejl5aDY3M3ZiZTJjbDFxMHZiNnU2ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l1JohKeoRkY7Oyaje/giphy.gif",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnF6bjA1bzh5aG5lMzV1eDJnM3N3Y2tkcmJ4OTgwdmNsaHl3ODFrbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2XflxzCDmtaPjA0KLZK/giphy.gif",
    ],
    titles: [
      "{name} is dancing!!",
      "{name} loves to dance!",
      "{name} is shaking some booty!!",
    ],
  },
  pout: {
    urls: ["https://giphy.com/gifs/reaction-sad-batman-tajVAagrp6tva"],
    titles: [
      "{name} pouts >:c",
      "{name} is pouting!",
      "{name} doesn't like that!",
    ],
  },
  shrug: {
    urls: [
      "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDJpMXo2amJkaWJ1c2c3aXIzNnNwbWZrOTU1aTBzbHBxd3huMTRrMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/jPAdK8Nfzzwt2/giphy.gif",
      "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGt6cXNreHA3eWlxeGhqbGF3eXYzd240b24zazN2ZHdhc2I4a2trMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/y65VoOlimZaus/giphy.gif",
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3RnMGkxeW45b3R5emNhMW1pNGg3aDBubnE5azdpdGFzd2h1djhjMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SAHGcjT1jNvDB6oxI8/giphy.gif",
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2Rud3hwNjA0Nzd4NTY1ZHc1Z29xYng2aXR5cXZvZWN2aGk4dXI2eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/n4FCJYLldGPC95d4ku/giphy.gif",
      "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnRja2NiMjc0bDVndmExY3loNDU0djVhM2p2aGtpbndvdW1rM3owMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sZEl1yTi26mJzrI4VN/giphy.gif",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXpuaG5oeW5oa3gybWZnNWUwMDU3bGVjMG1xcHg2d2RsY3AxMmVnaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ogb8RQdu8zQyc/giphy.gif",
      "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnk2Z2FvbDAzOGs2ZGw1eHV4ajhkY2VsOTBjMzBwMmZpanpmd3VpZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/K6VhXtbgCXqQU/giphy.gif",
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm1ldnVkZ2s4aXVzd2xnNzd5Y2lzYjI2NTB1cndycjY1eTZ2NnJxZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/H3BoxrpcT4fPynU424/giphy.gif",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnZkMXhjejB0ZG8wa3hldDc0aXBxaGY4Y2VwcWxzNGw2dHZ3eWRraiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vqKlNf8jpBB7O/giphy.gif",
    ],
    titles: ["{name} shrugs", "{name} doesn't care~", "{name} says, 'o well'"],
  },
  sleepy: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGkydGppeGM4OHFueWRtZDllYnI5OTcyeWc4Zmg0MWZyY256NmJiaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/bEs40jYsdQjmM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDdxYTQxYm80NTYycDU5bWc0NmNrbXh0NnpqY2VvdmJoODZ2eXV3eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/YNxvJmicapfWgQUOhi/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cGJieG5lOTYxczZ3OGVocm8wM28weTc0ODNhM2FyMmdjd3lrMGM5byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/neQwaD1vTvaQZsqzRK/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cGJieG5lOTYxczZ3OGVocm8wM28weTc0ODNhM2FyMmdjd3lrMGM5byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6MblrO4tnPypI4UM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c3U1NnBrNGZybm1rejRrZmxnZmE5N2N4MzZjdzdzbGYwZHB6end5eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/YGCjALcMdEouipLsYR/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjZ3N3VhNDY1dGlyc2xlZDJtMXZ5OW9vbjE5eWQ4NTIxaTZybnR0MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT0GqBkRFkHno3tOfe/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c3U1NnBrNGZybm1rejRrZmxnZmE5N2N4MzZjdzdzbGYwZHB6end5eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NytT69eq5daYcGY5XX/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c3U1NnBrNGZybm1rejRrZmxnZmE5N2N4MzZjdzdzbGYwZHB6end5eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/z31kxVFwkoeZ33yPS8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3d2dxaXB5YWdtYWJnOGQ1bWsyb2x5N2NlN3EwY2t1dmdjMWdqaDM0byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DhHRFlvQOWB044Zsm2/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YzJpb2l2MXE0cTJhczgyd2Mxd2kyN2RnY3N4azNvOW9mY3ZmcnBsayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYw1PU2VmN6kIrC/giphy.gif",
    ],
    titles: [
      "{name} is sleepy...",
      "{name} is tired...",
      "{name} needs a nap...",
      "{name} wants to sleep...",
    ],
  },
  smile: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHAydG4xZ2NmcjVwM2Y4OTdydDMybnNrZ2k3YXVsNXo4NGJsbG03MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QTrG6mjkHEkpFR3DqX/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHAydG4xZ2NmcjVwM2Y4OTdydDMybnNrZ2k3YXVsNXo4NGJsbG03MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11ezOCtJ7Eetri/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YW9lczd5cGJhdGEzOWRheTlsb3p5NTdicGk0MXpsbmFxZjc0MTNiNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/aesuRNmaYgcMM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZnBwb3h1NTZhc2VsdDVzZnk4N211eWluOW5ndWplNno2ZTMxM2tueSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d9A3OAEoPMsSEMcRPy/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Y2FydWMxb3F5YzBkNGg5c3EzYnhmZ2RkYjRwMWE1ZGphY2JiZ3UxdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LKqDgLlK6SuIM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dmpub2thOHJ3MG83NWEwbzhmOWc5ZTZwbThjN3JpbnRndnpoNHE0OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o6YglFWW1GHKbNeYo/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dmpub2thOHJ3MG83NWEwbzhmOWc5ZTZwbThjN3JpbnRndnpoNHE0OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/19sMMhJoxxELS/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3M3plNm9laDJ0NXRhbTYxZHhya3RpZG5wbWxqc2pzM3pmazMxcXA4byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/66uJQnhBgHPnZCErHa/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3M3plNm9laDJ0NXRhbTYxZHhya3RpZG5wbWxqc2pzM3pmazMxcXA4byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MziKDo6gO7x8A/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MHV6dDh6ZG8yYWh3enA0dmtkNDY0bm5zODUzZno3eDNnOWJtaWNrOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8FVcs24aSuQBpHPg4n/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3VsbnIzbDZ0bGJnYWp4eXI3MXQxM3ZuMWpmdHE5NXI4ajNhbHZoNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iyhIhjXRqqvGflAkWP/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjhxYmVhaGx1bXJvZmZidThxbjNsejRiaTZ1cmd6bnJjcmQ1dmUzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hZj44bR9FVI3K/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjhxYmVhaGx1bXJvZmZidThxbjNsejRiaTZ1cmd6bnJjcmQ1dmUzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/0ixAZaU8Gp8R5TdRQT/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjhxYmVhaGx1bXJvZmZidThxbjNsejRiaTZ1cmd6bnJjcmQ1dmUzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DYH297XiCS2Ck/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjhxYmVhaGx1bXJvZmZidThxbjNsejRiaTZ1cmd6bnJjcmQ1dmUzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ukmZRuEqc2Rbi/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjhxYmVhaGx1bXJvZmZidThxbjNsejRiaTZ1cmd6bnJjcmQ1dmUzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ukmZRuEqc2Rbi/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjhxYmVhaGx1bXJvZmZidThxbjNsejRiaTZ1cmd6bnJjcmQ1dmUzcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Dy6KtvPNfNVAIEx7O6/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2JrbHNsMTBwbm1qcmxzMjdlYXdzb29sd3R0NXhwMWdpMXBzbmJoOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/dvdcBNbAiNVT9Z0iwP/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2JrbHNsMTBwbm1qcmxzMjdlYXdzb29sd3R0NXhwMWdpMXBzbmJoOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SY2avzeaZ4N7lnbsl8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dzcwMHlmazFrN3Rjcmd1NmgxY2J5aHMzYnJqd3hlOGx3MngwMnRkayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rjkJD1v80CjYs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cDF3ejVia29jNDZxandrb244aDFyeGt0MGlkZ3dkMWtmd2tmaHo1ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ktABlcyUQIoHmBSlwb/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bW4waTA2aHFhODFzdzZvdmpoZmc0d2EzbnkzNHZ6dzV2NGU0ZmlsZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/soB01mo9e82HmHYfY5/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aW1kc2pnNzVzMGQ3b3Nwa2NrZjBjZmF4YmxyOHFoZnBxczE1amtoYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/okfvUCpgArv3y/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z3Z0aDJ2NWV1NjN6bHNpbWZydGt4NGJ1eXhoYnA2OW9vdDVqY3l3eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UAIg3J4OzepmYxQeAT/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eW14NWxheTB2eDVzdmk5NnVqM20xdWhlNnR0czAzc3IxMHFzY3BsOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cXblnKXr2BQOaYnTni/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emh5bmd5Y2M2bW5pbW1nN3ZpYWg3eWZua20xdHVzNHF2YWN6c292bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/HU3kZbOl0DWWI6ulbu/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bG95dGxtaGxjMGhqbHNoMDZ3MjVoZ25ueDIwaTV5aGFyd2NuODdrYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/12mwXD0A6E87L2/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dWIzMXpxaTRyMDV0a2s2MHUzcnlidXkwaXNndW1jeXZoMDJnbWFmMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pOeaTGiDBZgYM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emh5bmd5Y2M2bW5pbW1nN3ZpYWg3eWZua20xdHVzNHF2YWN6c292bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d7fKljD4WRftoHF031/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MWMwM2ZrbW5oMzZoamZxdjN4cGliYWc1bWdrM2hzdjRoNGhiZWNpayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WYyvz9PIhjLHgiyvR2/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnAxZWtlNXdzZWNyOWZiYWJsaDYzMHB5bmNvdThnajBobjNheWR2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BYul6RujgoRCryuCdL/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnAxZWtlNXdzZWNyOWZiYWJsaDYzMHB5bmNvdThnajBobjNheWR2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/EoW3jhM6MzsONM15zm/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnAxZWtlNXdzZWNyOWZiYWJsaDYzMHB5bmNvdThnajBobjNheWR2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/B5AVgxf0OzlyE/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnAxZWtlNXdzZWNyOWZiYWJsaDYzMHB5bmNvdThnajBobjNheWR2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FWAcpJsFT9mvrv0e7a/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnAxZWtlNXdzZWNyOWZiYWJsaDYzMHB5bmNvdThnajBobjNheWR2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3CQA4cPx7UDkY/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bGdjNGt2ZHg5MmhlYzBkNGF0Zmp5cDY0MHI5dHh4b3ZiaGFpaGdrYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/he43oHTj5D008/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2pjY2YzeHNocnB4amxuODA4cG85OGZwNjI1ZzZ0cXFnanQzM3BrZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IifbrS5cNj1ub91I1W/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cHFuMnkxN3l5d2Z1Z3pjbjM4MDQxdzFqdWRvdTY1cWZhbzN1aGxvOCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Wr37JyP3vNhfI57pXU/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MGJ6dmVwcHU3a3R5eXAwZDZ1MjhtaHA3c3hzaTlkeW5sYndld3FqYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/dEFIIniUxS4lKcjVOV/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTEyM2p1bWJiamt5bjFocTlqa3RqcDNlcGRrYTN0ZTRwM2k4c3A3NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LR5GeZFCwDRcpG20PR/giphy.gif",
    ],
    titles: ["{name} smiles! c:", "{name} has a grin!!", "{name} is happy!"],
  },
  smug: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW5odnpjZ2ZsdXk0bHZ2ZTVuYWNoaDlwbDhrMWN0cnpzdHJoYTJyciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Vff5Qxz6LLzag/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW5odnpjZ2ZsdXk0bHZ2ZTVuYWNoaDlwbDhrMWN0cnpzdHJoYTJyciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKWineS040erhjq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcW5odnpjZ2ZsdXk0bHZ2ZTVuYWNoaDlwbDhrMWN0cnpzdHJoYTJyciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKWineS040erhjq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cGhieHJjYTVvbWFmeW83ZW1oZnNyM2h2dWJiM2N0MnJnNWhxNXJrdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JGSCwTt87agIU/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bW84d3cxMXg5OWFkdWx6ejBiaDR6YTRqdWFmMGJhNmtqbzE3ejE5diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/B5G2f8kELLAsp4XVrs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2cxYjcyNzFzbzAzM2pma2pyYW4wbW5mMWVoNHRwczB5NXB4Z3I5dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/aesuRNmaYgcMM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2cxYjcyNzFzbzAzM2pma2pyYW4wbW5mMWVoNHRwczB5NXB4Z3I5dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2w5PwZgB7PG67s7O7s/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGhuZnExaXIxY3JvMWNmZ2dldmphdGs4YnA1dzJsOGh1ejkwd21iOSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/26BRzXPtk1nUiaMxO/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2VsYzVleTcycnNuZGIxeHprbWtvbDlhb2w2bHlwMjh5bWh4eDVjeSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/r6BjJgDkeQcGA/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2VsYzVleTcycnNuZGIxeHprbWtvbDlhb2w2bHlwMjh5bWh4eDVjeSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/wkBysf5P5eCOc/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2VsYzVleTcycnNuZGIxeHprbWtvbDlhb2w2bHlwMjh5bWh4eDVjeSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/fnVWIQYq8mU5853ELt/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dm02dmhpMGxneGs3ZXNoM2Zrc2ZmcnZnd29jeDFrNXRlbXM5aGYxMCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/BbMJgat91VCeFqCaax/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2N0ZjM1Z3ZoZ3k5OXI1MGh4NmhpZXB5N3BtMjgyd2Fkd3pza2g3cCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/44b1ABtsG7VTy/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3b2N0ZjM1Z3ZoZ3k5OXI1MGh4NmhpZXB5N3BtMjgyd2Fkd3pza2g3cCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/xTiTnnNFM62sUuGwNi/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MGNyYzhrOWtvcjMzN2RrYWdtdmY1enk3OWE1dW1tZThjOHB3OGF3aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/geJdVv7ByXUnCGdjlh/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTkwMjVpbHg2aHV2MGVwd3dteGJ5MXNtamdvNzl4cHh5YXVlYWNkYyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/2UDBcExoz3R08IRpWr/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXc2ODduNW84Mmpra3dqeDBzejY2eXJmbzk4OG1waW85aTA3bzA0dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f6zcJssQkdT4VQ7dIF/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXc2ODduNW84Mmpra3dqeDBzejY2eXJmbzk4OG1waW85aTA3bzA0dSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JR6YqHkUsxTX8ozSYh/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bnZ5ODIwb3pycDA5c2RsOXRwZXN6aTZ0enVwZXRkMno2OGt0dXdoZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/uv7Y6e1tDuiL82Eu1i/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3enZsb3diODZnazV4eDFvamJ5Ynp6Yjk0eXdnZnluYzVrZndzOGl1YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XSvmEGj0qqYlW5ueuQ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZGV1dmQ1d2hlNDh4OHl0cmVtNGE5YW5pNDFuc2phaG5kdnozbzhhcSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1XGbq09J7GnQ4uPl1l/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dHR1eWhpaHI5OTlucmMyeTJ3OXlqZWllejFha3o4ajRtczZpcXhudiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WS16R23Miz6P1Bp0C7/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a3dkeG91ajk1ajF4ZGFlYWM5cDQwdDRxN3JqbnNnM3BwOTdjenNmeiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/u4cGGfRq8Z4BCD3tmU/giphy.gif",
    ],
    titles: [
      "{name} scoffs c:<",
      "{name} has a smug look c;",
      "{name} thinks little of you ;)",
    ],
  },
  thumbsup: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHdvZmFuaTgydzRlbzZ0MjhnNGQxOTNrb3k5ZW02bTJqeXVodHJwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rMEJyjch7L1tlRlCl3/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHdvZmFuaTgydzRlbzZ0MjhnNGQxOTNrb3k5ZW02bTJqeXVodHJwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8YKstBTN4i68E/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHdvZmFuaTgydzRlbzZ0MjhnNGQxOTNrb3k5ZW02bTJqeXVodHJwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UOkqOjQgp4lIujxa4w/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHdvZmFuaTgydzRlbzZ0MjhnNGQxOTNrb3k5ZW02bTJqeXVodHJwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/btbTjWIQh2WI2Towh5/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHdvZmFuaTgydzRlbzZ0MjhnNGQxOTNrb3k5ZW02bTJqeXVodHJwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2441Rzq5dCUWoEAeqZ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dWp6Z3dkbGcxbDJmeXJoYmJlbzk3ajB6d2txZ2l3YWYxcG5maWNlYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9c9tE5Pr0qElW/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MTJpODlobmxyaTVrM3dpczJ6djhzeWZmZXl0d2I2bTFxcTdnOWZ3cSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3ohs7IyTLZ1lfV64zS/giphy.gif",
    ],
    titles: [
      "{name} gives a thumbs up!",
      "{name} agrees!",
      "{name} has a thumbs up!",
    ],
  },
  thinking: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/a5viI92PAF89q/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d3mlE7uhX8KFgEmY/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DfSXiR60W9MVq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WRQBXSCnEFJIuxktnw/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/y3QOvy7xxMwKI/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5XELueHTZd3XCaMGbw/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOW1hYzF5Mm0xbzZ2cHR5dHM4cGdydGU2amVxYmhhY2psOHpjZjFncyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKTDn976rzVgky4/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Zmg3emRpamtleWcyMmF4MzM0NnJ2cW9nMXBoMTYyZ2tidnMzam1wMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kPtv3UIPrv36cjxqLs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Zmg3emRpamtleWcyMmF4MzM0NnJ2cW9nMXBoMTYyZ2tidnMzam1wMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kPtv3UIPrv36cjxqLs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dnlzNGg0ZjRpZHNhZzJ5bzk3M3BvcTgwOTh1MGdtd3p4ZTFnNDdjNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Ogq017TWp45JadcpIK/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dnlzNGg0ZjRpZHNhZzJ5bzk3M3BvcTgwOTh1MGdtd3p4ZTFnNDdjNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Ogq017TWp45JadcpIK/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dnlzNGg0ZjRpZHNhZzJ5bzk3M3BvcTgwOTh1MGdtd3p4ZTFnNDdjNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TPl5N4Ci49ZQY/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N3RrbHUwaHh6cTltZ29iNjZneGdhd2lpZzJtMTI2c2d0aGJuaGVrZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/W3a0zO282fuBpsqqyD/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N3RrbHUwaHh6cTltZ29iNjZneGdhd2lpZzJtMTI2c2d0aGJuaGVrZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WUwdqYmGaLhP1TVhrL/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTEyM2p1bWJiamt5bjFocTlqa3RqcDNlcGRrYTN0ZTRwM2k4c3A3NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ifQNP4Yr3tCmwbPtB1/giphy.gif",
    ],
    titles: [
      "{name} is thinking...",
      "{name} is trying to understand",
      "{name} cannot process that...",
    ],
  },
  triggered: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vk7VesvyZEwuI/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/wVcNP3TnXbl84/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/KymorXwDdmvw4/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pYI1hSqUdcBiw/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/N4hHsZoD3edqw/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ZMJQEhBskQmQM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IG5tmcGU9xenK/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWgxdXA1eWo0bzByenFvbzN5Zmd4M3pnNjl4eGFsdDkwYzA4NHBwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3q2K5jinAlChoCLS/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bnl6d3U0dHNjNXJrdTE2ZHU4aW1qeTd4azRsN2hmdDkxMnhzbnVqNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/14tvbepZ8vhU40/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDVxaDE5MmJ0M25lZndtYnJyYzd4dTZvcWxxejJ1cG5iNTQ1MjB4aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3978hPCi5iREQk5W/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTEyM2p1bWJiamt5bjFocTlqa3RqcDNlcGRrYTN0ZTRwM2k4c3A3NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iJxHU0Fo2uMxLlmWgd/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3c3BibDFwajB1bXd3aGZqNGdqMzAyY251b244enF5MGRkY2hpemRveCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XqrGAfw4Xuro4/giphy.gif",
    ],
    titles: [
      "{name} is triggered!",
      "{name} is TRIGGERED.",
      "{name} is TRIGGERED!!!!",
    ],
  },
  teehee: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExejg2MTMzbWczdTZ4cHpxMno4Mmp4MGNoZndxZno4OTZmcnNzOTVwOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/itMjo4Vjk6d7G/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExejg2MTMzbWczdTZ4cHpxMno4Mmp4MGNoZndxZno4OTZmcnNzOTVwOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8ciLGd6O0d9YXjE5zR/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExejg2MTMzbWczdTZ4cHpxMno4Mmp4MGNoZndxZno4OTZmcnNzOTVwOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RP3AnZqvnzrY8hlYMk/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MTBzOW14b2U5M3Njd2g0MGV2aXl6YWU0dDVlcWVyeWdlYjF3MHVvbiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UuGtTaLPOAxZnO2vrj/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cWVhdW56b25xYXh1Z2s3NnNyNmFleXM4bXBkbnZpMTFna3BldDc2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/R0TLuReCtROToGCuYc/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3VsbnIzbDZ0bGJnYWp4eXI3MXQxM3ZuMWpmdHE5NXI4ajNhbHZoNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f8pT7bphqES4M/giphy.gif",
    ],
    titles: ["{name} giggles~", "{name} c;", "{name} ;P"],
  },
  love: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmYxdHd2Mzl0ZWQyMG8yeXp2cWVtdnJ5Y2N4dTN6NDVpMGg1dzA3ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f0lS4lOcrGGaAVpxT8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z2pzaGlnaTZteDZtZW50d2J0MzYzNzlvdmRoODk2eGxienNhcHRuOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1hqb8LwPS2xCNCpWH8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Nzl1MzFncmQxa2lvZWNmYmM2MG9mNjJkNmozcXN5Z2MxNjM0MWRxYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/R6gvnAxj2ISzJdbA63/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndnOXdxamZudWg3NGJwd2EwZ3RuY2tlN3R3d2p4ZTc4aGhqeXBmYSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/QbQeDAEspJ5oCeGWJk/giphy.gif",
    ],
    titles: ["{name} <3"],
  },
  wink: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cWF4djZyMGE3YzZlbWt1bWd0d2o4Z2IxcXlyamRzemo1MWEydDRtcSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1xHeWqpsUtjm8/giphy.gif",
      "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGRmeDNuOWlpeW9scG1iZzJ1bzh2dzRiNHA1dWd0OXBrMW0xdDI2ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/wrBURfbZmqqXu/giphy.gif",
      "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWhlcW95ZTZ1YWt4ejY1YTkzb21saW1jY2UxNGtpNDFkMm55dXE3YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/10UUe8ZsLnaqwo/giphy.gif",
      "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWZlaW1nN3AycnAzY3R5eG5oamFta3d3ZzZpZ3h4NGF3aGsyeDJ3YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dk3TmFZpn6pUI/giphy.gif",
    ],
    titles: ["{name} is winking ;)", "{name} ;)"],
  },
};

const actions: EmotesNActionsT = {
  hug: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2V0bGd0cXV3bGI5cGtxN2RyYWFueWtqYzN2NzVocGM5czFnZmJoZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4CTlTWDNqcBva/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2V0bGd0cXV3bGI5cGtxN2RyYWFueWtqYzN2NzVocGM5czFnZmJoZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VduFvPwm3gfGO8duNN/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2V0bGd0cXV3bGI5cGtxN2RyYWFueWtqYzN2NzVocGM5czFnZmJoZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/42YlR8u9gV5Cw/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3em5zeTRzYXhiMmFibWNibTZ2MnQwd2h5bjl5cDN1c3Q5dGV6dDRmZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gnXG2hODaCOru/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZTRpaHFzc3Nxcmlza3hrcWs5Mmd3YWpjejJibnkwcmZmank2cHVhaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TGjXIOmDhfJFlY5NM5/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NGFod29yMGE1ZDBkcng0cXY5NXp6bWJxNm05MHI5bzFmanZ5ZmZ4ZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hRCFBt3ta0DJeGto2R/giphy.gif",
    ],
    titles: [
      "{name} hugs {target}!",
      "{name} gives {target} a big hug!",
      "{name} hugs {target}!! Don't squeeze too hard!",
    ],
  },
  poke: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2c4cm82cGFxcjYzMDBiaWQ5ejFsbWllc3lxb3U5ejE0dDRveHFhZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jCENc3aA4fLJm/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2c4cm82cGFxcjYzMDBiaWQ5ejFsbWllc3lxb3U5ejE0dDRveHFhZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3x5nIjlszTBQs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2c4cm82cGFxcjYzMDBiaWQ5ejFsbWllc3lxb3U5ejE0dDRveHFhZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/wsUuwZ0pdhUMxvO55c/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2c4cm82cGFxcjYzMDBiaWQ5ejFsbWllc3lxb3U5ejE0dDRveHFhZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f5GY3rJG60NShta01W/giphy.gif",
    ],
    titles: ["{name} boops {target} .-.", "{name} pokes {target}! boop!"],
  },
  slap: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGZ6OWNpN3Q5Y3YwM2MyejE0bnhncXY2MXpmY2hwdmVxeGxzYnJuNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3XlEk2RxPS1m8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGZ6OWNpN3Q5Y3YwM2MyejE0bnhncXY2MXpmY2hwdmVxeGxzYnJuNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4R6EMXhNPz5WsJFEta/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGZ6OWNpN3Q5Y3YwM2MyejE0bnhncXY2MXpmY2hwdmVxeGxzYnJuNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/mEtSQlxqBtWWA/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MnYyZGFzOXAzNHB3ODZkdXE2bndnaTdhazMwMWFndXo3dGdhYmNsYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/60rUVyj8ShyuEhHbaz/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MnYyZGFzOXAzNHB3ODZkdXE2bndnaTdhazMwMWFndXo3dGdhYmNsYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1zgOyLCRxCmV5G3GFZ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3czkyMTl0YXVqcG1wbmFkb2tqenpqYnh3bGp6NWFtem50cjhtampjdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6HFUDKwlWcAbC/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NmhoYnVuYnNwZjV6N2Q3a2llNDMxbnJhb3M2Nnl3c256MjVvZHg3MyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l41YtWUr1CGntlR1C/giphy.gif",
    ],
    titles: [
      "{name} slaps {target}!! Deserves it!",
      "{name} slaps {target}!! oof.",
      "{name} slaps {target}!! That looks like it hurt...",
    ],
  },
  stare: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/96DeW8wUdpN96/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/c5FhF1waAJ5wk/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BIZkwFtu2xDlS/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FY8c5SKwiNf1EtZKGs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XF5AnCJV7PCtGwdHNC/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MVoX99cLXXU0gq7QuG/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8ac9tQi8GtuJaW8HBJ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNG9tYWhqN2NjNGppbmtpZWN0NWlyYmpidmcwMjRxaGxhNHhyYml5eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Q4ScVMm5oBP44/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NDRyNHltNnpxc2RyNTFqY2YwZWVmbmUwcWRvYTc5MTE0d3phb2luMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/F3BeiZNq6VbDwyxzxF/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NDRyNHltNnpxc2RyNTFqY2YwZWVmbmUwcWRvYTc5MTE0d3phb2luMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/aXUU30cDBa9tVQz37V/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aTg4NnZpcXljMmkydXhpZjk0Nm4zcmhlczJ5dXc4M3pjMGRyaGJ5byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HU3UpYqHp68mK64/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aTg4NnZpcXljMmkydXhpZjk0Nm4zcmhlczJ5dXc4M3pjMGRyaGJ5byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/meJN6qdG74lUKAJTQl/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aTg4NnZpcXljMmkydXhpZjk0Nm4zcmhlczJ5dXc4M3pjMGRyaGJ5byZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9Z7SJLN4UYgGcVZQaJ/giphy.gif",
    ],
    titles: [
      "{name} stares at {target}...",
      "{name} looks directly at {target}'s eyes...",
      "{name} stares at {target}... What did you do??",
    ],
  },
  highfive: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emhya3pmY2c2ZGtob3o0aTltd3Q5ZjFpaTd1c3NmbzF4em9vcmFmOSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/jRPuK99kwLGIblQfQQ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bWh0aGppZW1xbzZ5ZnVkZHh5OWc2MmtwaTAzZzIyc3dvaHZoemw3YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/KaYDY4bVN58GELotj4/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eThjenh6dXJpa2prNmI3a2gzc3NxOGdpbTRodGo1Z3NpZGxucnF0ciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26BRr8WThUKXjIWpq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OWJiZWZ1eWl0MG4yeDI2aG5qMmRhY24ycGcyMmZ6a2V0ajdlc2FmMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8zzR3BjbioxdMcodab/giphy.gif",
    ],
    titles: [
      "{name} gives {target} a highfive!",
      "{name} highfives {target}!",
      "{name} highfives {target}! Nice!",
    ],
  },
  greet: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHJseDVjeTltYjd0dmQ5bmFleXpxeXduZ202OTFhM3Vra3NwMWRnMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9IgG50Fb7Mi0prBC/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aXl5N25wcDk3ZTdjYm9kNzJpNncxdml2c2U1MnFjYnp2a2tvZ3docCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/L2Tc5iTowsRFmpOMb0/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWNjc3Y3c216MDI3Yjh6bjZsNjd0ZmQycDY1am93ZXJzMWd4bHc2ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LPFNd1AJBoYcVUExmE/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWNjc3Y3c216MDI3Yjh6bjZsNjd0ZmQycDY1am93ZXJzMWd4bHc2ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6hKL8BI8rRNrMRFtAx/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWNjc3Y3c216MDI3Yjh6bjZsNjd0ZmQycDY1am93ZXJzMWd4bHc2ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eoVusT7Pi9ODe/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWNjc3Y3c216MDI3Yjh6bjZsNjd0ZmQycDY1am93ZXJzMWd4bHc2ZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6yU7IF9L3950A/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dGwwenZmNTVnYzY4b3VheG0ydXdsbXR1cHJ4azlrenB1eTB2cGZwdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/oBYB0gqUy3xxBf89aT/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTVrMTczanUyejJjcHBnc2txb29qa3FlcnlnODRuNndnbnZrY2toNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/101DNxoBTatF16/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cDIwYnlpbmx0NW82N2hkcnZ4OTQ5ZDg2OHpqemNmNHZkazBmM21hciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1hPhIFVwHMSaYVQp99/giphy.gif",
    ],
    titles: [
      "{name} says hello to {target}",
      "{name} waves at {target}",
      "{name} says hi to {target}!",
    ],
  },
  punch: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemgxZWJvNGhleGR3MDJ2MnU2bzIxdWVtMGZwODRoYzljMW90Ym1kbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SzC42gUrhHopW/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemgxZWJvNGhleGR3MDJ2MnU2bzIxdWVtMGZwODRoYzljMW90Ym1kbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/d31wMAc5PUktQGpq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemgxZWJvNGhleGR3MDJ2MnU2bzIxdWVtMGZwODRoYzljMW90Ym1kbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8ZkfimIBeq8g0A0BUD/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemgxZWJvNGhleGR3MDJ2MnU2bzIxdWVtMGZwODRoYzljMW90Ym1kbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Y11Y1zMBIWPIuU8XHn/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemgxZWJvNGhleGR3MDJ2MnU2bzIxdWVtMGZwODRoYzljMW90Ym1kbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NY3tXwOBUwQYq7lbXx/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YnM0ajFubWYzaXQyeW1wNjZiMWkweTUzdzk2M2swbTRkODVvd3FlciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LPIaOdW7YXoOUTuwRe/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTIwc2M1cnJ4ZWJwMGNjMW9jZ3l3dmJ4Y3E3OXAzZ2FyZTJ4ZDMydyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/qiiimDJtLj4XK/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTIwc2M1cnJ4ZWJwMGNjMW9jZ3l3dmJ4Y3E3OXAzZ2FyZTJ4ZDMydyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RN96CaqhRoRHk4DlLV/giphy.gif",
    ],
    titles: [
      "{name} punches {target}!! Oof",
      "{name} gives {target} a punch! Ouch!",
      "{name} gives {target} a wack! Ha!",
    ],
  },
  handholding: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NHZ6YTl3bnY3dnZuaXZqZHNmZjczNjU2NngwamZpa3NxdXBvbXI4cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o85xIllHU18SKhY40/giphy.gif",
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2NtanZ0bm8wOHM4NXNnYjRhbjFvd2FqYnE0eHpqbnB5d2Zlc205eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTiTnB1aEUVOtf7bQA/giphy.gif",
      "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHFsZGpsejNvenB4cmlqcjI2bWgzbmlhdGN2bzR6M2t6emJwN2xzOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8dk3eMHn0Y0Fi/giphy.gif",
    ],
    titles: [
      "{name} holds {target}'s hands, adorable!",
      "{name} grabs {target}'s hands, awww",
    ],
  },
  tickle: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXM4Y2FmMGVuNjVzZGoxNXczdDZ1eXJodDZjbzZ3bjV4N2xyYW01NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3ohuPBnHuElqeTtlkc/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXM4Y2FmMGVuNjVzZGoxNXczdDZ1eXJodDZjbzZ3bjV4N2xyYW01NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7sC5l8ZZKMzXG/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXM4Y2FmMGVuNjVzZGoxNXczdDZ1eXJodDZjbzZ3bjV4N2xyYW01NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/GBHgB17Bd9X3O/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXM4Y2FmMGVuNjVzZGoxNXczdDZ1eXJodDZjbzZ3bjV4N2xyYW01NyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/UIIyMCABbnUAg/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NXcwaW1wN2dtMHhvbDA3bW9vbW9hYmY1OTl2ZjZsbGw5NTZkczNicyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vf5RXzqGIWrZu/giphy.gif",
    ],
    titles: [
      "{name} tickles {target}! Ha!",
      "{name} tickles {target}! OwO!",
      "{name} tickles {target}!",
    ],
  },
  kill: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXZjODJxMmh1NnJ1eXVxOGRwcWlmOWEzNWxrZmFtMjV3NnV4cXU0ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CiZB6WIjaoXYc/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXZjODJxMmh1NnJ1eXVxOGRwcWlmOWEzNWxrZmFtMjV3NnV4cXU0ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/14u6vffnoL7tzq/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ZGJvcHI0aXQybHVoaWFmeWljNGZtM2xvZXkwOXVkeTB6aTJ1N3p6ayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/12zQQNVooHEIGQ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bXU0cGdrcHp3ZW43ZzZlajAzbnJ6bHRocDN3b2syMmpneWx1Y3htcCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/10aY2spcMJPFUk/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MnN6cDdrOGI5bjZwd25scmthdW9ueHJtbWNvZTk4M25qb2prbG50YiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4uthremE8sCvJfR2Sa/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cTE1aHo3ZGY2dDA5cTN1cWhtZmhncmN1bzFtZzNxa2Rjc21wODRsMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/7TTgV830a3luvc0FbJ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cTE1aHo3ZGY2dDA5cTN1cWhtZmhncmN1bzFtZzNxa2Rjc21wODRsMiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/U3sOkA3vL7lFLKYw6I/giphy.gif",
      "https://giphy.com/gifs/sad-meme-igkaipulla-template-tNnvxQmLhRdS5gJ4SQ",
    ],
    titles: [
      "{name} killed {target}! Brutal!",
      "{name} killed {target}! Oh my...",
      "{name} killed {target}! oof!",
    ],
  },
  lick: {
    urls: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWkyNTd3YXloMXloc2U1aG5kemYwNWp0anozOHJwZ2hjaW9vNGdpdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/12VqfGevHQc2vS/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWkyNTd3YXloMXloc2U1aG5kemYwNWp0anozOHJwZ2hjaW9vNGdpdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/agfuIXk2Ht9As/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWkyNTd3YXloMXloc2U1aG5kemYwNWp0anozOHJwZ2hjaW9vNGdpdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/11SyC4F2WUFfQQ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWkyNTd3YXloMXloc2U1aG5kemYwNWp0anozOHJwZ2hjaW9vNGdpdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/q9ldmTuld2Vbifpp4W/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWkyNTd3YXloMXloc2U1aG5kemYwNWp0anozOHJwZ2hjaW9vNGdpdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/K7PCrSotYudyvolITs/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWkyNTd3YXloMXloc2U1aG5kemYwNWp0anozOHJwZ2hjaW9vNGdpdiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JlVkLKuxRSvLy/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bmxoN3ozeGYzYm9mdzlkdWQ0NTk4dm5yOTByenNydjN2cDZ5dHdjYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iO7nHxU0xqkow/giphy.gif",
      "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXd3Z3hvdWJ0dGVycXNrM3ppcXl2cGdkaDZldXhtenRlcHE2MnhsbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kC5wccHNLWdoJWsUMI/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTdid3g0N2hha3Fvb3RsbHAwYTFnczlsM2V1M21jNzZlem81cnVwciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5Nle87WgNwDbsj3P4Y/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTdid3g0N2hha3Fvb3RsbHAwYTFnczlsM2V1M21jNzZlem81cnVwciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nzsWN8iSDwSlhCDokc/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTdid3g0N2hha3Fvb3RsbHAwYTFnczlsM2V1M21jNzZlem81cnVwciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QBwRKyS6vXNfmLF7TR/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTdid3g0N2hha3Fvb3RsbHAwYTFnczlsM2V1M21jNzZlem81cnVwciZlcD12MV9naWZzX3NlYXJjaCZjdD1n/W3H7yzvQowNSy124C8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTR4bHRpZmpidDhmZDVia3dyMG5zaG9icWFsMjBkZGE1bGU4cGRqdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/IsODcceRrNPmvjli1q/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXpxcngxMTlxenZxd3BjMDdxMWlnM2QzbTY3eHoxOWlwOTVwZTVweSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xcnw6F78ETwuQ/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eG5mbnJlc2RsYTRqZ3AyOGhpYzF5bWh4eHQ3dmgzYnkwMGF0M2s5cCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/twQZemYIce0R6qkXRp/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N3Rtd2U2bzdkbHBtNHhud2FxOWd1a2ppb29sdDJjYzhmM3hoNjdrNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MFVXn1fmymn0x8H5XH/giphy.gif",
      "https://lede-admin.dailydot.com/wp-content/uploads/sites/69/2024/04/travis-scott-fish-meme-.jpg",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3enJidHlhOXJma3hnNXVnbzg3NXg2YTg0Z3Y1Mnp1c3l0dnZiN3o5diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pIKwng0u1RTRx2EzDo/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXIycXFqaTNvZjgzNm53ZnFxaWU1MzFwZDkzbnNmanRhbGVnYzQwZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/diDOx07FacXlQu6MkP/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXIycXFqaTNvZjgzNm53ZnFxaWU1MzFwZDkzbnNmanRhbGVnYzQwZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/NcrhM3USM6TABpus85/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z3pnMTZvZnV3OXUwbjRia2N1dDU3YWNseW1tc3Y2ZDR6ODlxbzI2dCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xe3AmvAGoQBLIw6Fq9/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bGIyd25sZW8weXRhNmlsd3cwc2UzaTdqOHlpb3R0a3MzZDQ2eHhjZyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5hs7ufETBVQZqEPJRh/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3ams5eDhxM2w5ODFwd2dmZGh1MmFwOGl3OXYxdXVpYnNheHRibDh2bCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o85xosW6qQsCsZ3Ve/giphy.gif",
    ],
    titles: [
      "Ew! we dont support licking here. heres a random meme instead :)",
    ],
  },
};

const items_as_string_option = Array.from(Store.ITEMS)
  .filter(([_, data]) => !!data)
  .map(([id, data]) => ({
    name: data!.name,
    value: id.toString(),
  }));

const commands = [
  new SlashCommandBuilder()
    .setName("kraa")
    .setDescription("Replies with help for dummies"),

  new SlashCommandBuilder()
    .setName("counting-details")
    .setDescription(
      "Sends the current count and the current event (counting events are listed in the Actions)",
    ),

  new SlashCommandBuilder()
    .setName("net-worth")
    .setDescription("Check how fat someone's wallet is 💰")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u wanna check")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Invite someone to a rock paper scissors, with a bet.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u wanna SMASH")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("min 1 coin")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500_000_000),
    ),

  new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("We love gambling dont we")
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("min 1 coin")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500_000_000),
    ),

  new SlashCommandBuilder()
    .setName("superiors")
    .setDescription("Top 5 richest users on the server"),

  new SlashCommandBuilder()
    .setName("trap")
    .setDescription("Trap the previous number"),

  new SlashCommandBuilder()
    .setName("lottery")
    .setDescription("Join the current lottery")
    .addNumberOption((option) =>
      option
        .setName("answer")
        .setDescription("Your answer to the question")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("donate")
    .setDescription("People are desperate around here...")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u wanna donate to")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount you want to donate (>= 10)")
        .setMinValue(10)
        .setMaxValue(500_000_000)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),

  new SlashCommandBuilder()
    .setName("steal")
    .setDescription(
      '"Borrow" from someone just a few coins... Be careful not to get caught...',
    )
    .addUserOption((option) =>
      option
        .setName("victim")
        .setDescription("mention the person u wanna borrow from")
        .setRequired(true),
    ),

  new SlashCommandBuilder().setName("store").setDescription("Display the shop"),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy something from the shop")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The item to buy")
        .setChoices(...items_as_string_option)
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("quantity")
        .setDescription("The number of copies from the item")
        .setMinValue(1)
        .setMaxValue(50),
    ),

  new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give an item to someone")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The item to give")
        .setChoices(...items_as_string_option.toSpliced(ItemId.DIAMOND, 1))
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u want to give the item to")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Show your inventory")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u wanna SMASH"),
    ),

  new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit money from your wallet")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount to deposit")
        .setMinValue(100)
        .setMaxValue(500_000_000)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw money from your bank")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount to withdraw")
        .setMinValue(100)
        .setMaxValue(500_000_000)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("jackpot")
    .setDescription("Get the current jackpot"),

  new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Generate a meme")
    .addStringOption((option) =>
      option
        .setName("meme")
        .setDescription("The meme")
        .setRequired(true)
        .addChoices(
          ...Array.from(Meme.MEMES).map(([type, data]) => ({
            name: data.name,
            value: type.toString(),
          })),
        ),
    )
    .addUserOption((option) =>
      option
        .setName("user1")
        .setDescription("First user in the meme")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option.setName("user2").setDescription("Second user in the meme"),
    ),

  new SlashCommandBuilder()
    .setName("rate")
    .setDescription("Rate a person by some category")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("Mention the target")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("The category")
        .setChoices(
          ...["gay", "furry", "aura", "good boy"].map((el) => ({
            name: el,
            value: el,
          })),
        )
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("mini-me")
    .setDescription("The user's mini-me")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("mention the person u want to see their mini-me"),
    ),

  new SlashCommandBuilder()
    .setName("convert")
    .setDescription("convert your gems and get coins")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of gems you want to convert")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("wear")
    .setDescription("Put an item on your mini-me")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The item to put")
        .setChoices(items_as_string_option.slice(ItemId.START_SHIRTS))
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("flame")
    .setDescription("Get a flaming of a member of the server")
    .addUserOption((option) =>
      option.setName("target").setDescription("The member to flame"),
    ),

  new SlashCommandBuilder()
    .setName("hide-n-seek")
    .setDescription("Play hide and seek with fellow members")
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("The amount each participant needs to bet")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500_000_000),
    )
    .addStringOption((option) =>
      option
        .setName("currency")
        .setDescription("The currency for the bet")
        .setRequired(true)
        .setChoices(
          { name: "🪙 Coin", value: Currency.COIN.toString() },
          { name: "💎 Gem", value: Currency.GEM.toString() },
        ),
    ),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Play a trivia game with fellow members")
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("The amount each participant needs to bet")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500_000_000),
    )
    .addStringOption((option) =>
      option
        .setName("currency")
        .setDescription("The currency for the bet")
        .setRequired(true)
        .setChoices(
          { name: "🪙 Coin", value: Currency.COIN.toString() },
          { name: "💎 Gem", value: Currency.GEM.toString() },
        ),
    ),

  new SlashCommandBuilder()
    .setName("fbi")
    .setDescription("Pay the FBI to find (maybe) who stole from you last!"),

  new SlashCommandBuilder()
    .setName("bribe")
    .setDescription("Got caught? try bribing the police...")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount to bribe")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50),
    ),

  new SlashCommandBuilder()
    .setName("time-table")
    .setDescription("Get the weekly time table"),

  new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Get the weekly schedule"),

  new SlashCommandBuilder()
    .setName("social-media")
    .setDescription("Get all of the social media links"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Your personal prophet")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Well, your question")
        .setMinLength(2)
        .setMaxLength(50)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship two members together!")
    .addUserOption((option) =>
      option
        .setName("user1")
        .setDescription("The first user")
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName("user2")
        .setDescription("The second user")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("define")
    .setDescription("Get a definition of a term")
    .addStringOption((option) =>
      option
        .setName("term")
        .setDescription("The term to get definitions of")
        .setMinLength(2)
        .setMaxLength(20)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("uwuify")
    .setDescription("Transform a message to an uwu form")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to transform")
        .setMinLength(2)
        .setMaxLength(50)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a 6 sided dice"),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Gamble on a coin flip")
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("min 1 coin")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50_000_000),
    )
    .addStringOption((option) =>
      option
        .setName("choice")
        .setDescription("Heads or tails?")
        .setChoices([
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" },
        ])
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("checklist")
    .setDescription("Get your checklist of the day"),

  new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Get your quest of the day"),

  new SlashCommandBuilder().setName("kebab").setDescription("Cook a kebab"),
  new SlashCommandBuilder().setName("beer").setDescription("Make a beer"),

  new SlashCommandBuilder()
    .setName("flag")
    .setDescription("Get a random flag and guess it!"),

  ...Object.keys(emotes).map((emote) =>
    new SlashCommandBuilder().setName(emote).setDescription(`a ${emote} emote`),
  ),

  ...Object.keys(actions).map((action) =>
    new SlashCommandBuilder()
      .setName(action)
      .setDescription(`a ${action} action`)
      .addUserOption((option) =>
        option
          .setName("target")
          .setDescription("The user to apply the action on")
          .setRequired(true),
      ),
  ),
].map((cmd) => cmd.toJSON());

const flags: Record<string, string> = {
  ad: "Andorra",
  ae: "United Arab Emirates",
  af: "Afghanistan",
  ag: "Antigua and Barbuda",
  ai: "Anguilla",
  al: "Albania",
  am: "Armenia",
  ao: "Angola",
  aq: "Antarctica",
  ar: "Argentina",
  as: "American Samoa",
  at: "Austria",
  au: "Australia",
  aw: "Aruba",
  ax: "Åland Islands",
  az: "Azerbaijan",
  ba: "Bosnia and Herzegovina",
  bb: "Barbados",
  bd: "Bangladesh",
  be: "Belgium",
  bf: "Burkina Faso",
  bg: "Bulgaria",
  bh: "Bahrain",
  bi: "Burundi",
  bj: "Benin",
  bl: "Saint Barthélemy",
  bm: "Bermuda",
  bn: "Brunei",
  bo: "Bolivia",
  bq: "Caribbean Netherlands",
  br: "Brazil",
  bs: "Bahamas",
  bt: "Bhutan",
  bv: "Bouvet Island",
  bw: "Botswana",
  by: "Belarus",
  bz: "Belize",
  ca: "Canada",
  cc: "Cocos (Keeling) Islands",
  cd: "DR Congo",
  cf: "Central African Republic",
  cg: "Republic of the Congo",
  ch: "Switzerland",
  ci: "Côte d'Ivoire (Ivory Coast)",
  ck: "Cook Islands",
  cl: "Chile",
  cm: "Cameroon",
  cn: "China",
  co: "Colombia",
  cr: "Costa Rica",
  cu: "Cuba",
  cv: "Cape Verde",
  cw: "Curaçao",
  cx: "Christmas Island",
  cy: "Cyprus",
  cz: "Czechia",
  de: "Germany",
  dj: "Djibouti",
  dk: "Denmark",
  dm: "Dominica",
  do: "Dominican Republic",
  dz: "Algeria",
  ec: "Ecuador",
  ee: "Estonia",
  eg: "Egypt",
  eh: "Western Sahara",
  er: "Eritrea",
  es: "Spain",
  et: "Ethiopia",
  eu: "European Union",
  fi: "Finland",
  fj: "Fiji",
  fk: "Falkland Islands",
  fm: "Micronesia",
  fo: "Faroe Islands",
  fr: "France",
  ga: "Gabon",
  gb: "United Kingdom",
  "gb-eng": "England",
  "gb-nir": "Northern Ireland",
  "gb-sct": "Scotland",
  "gb-wls": "Wales",
  gd: "Grenada",
  ge: "Georgia",
  gf: "French Guiana",
  gg: "Guernsey",
  gh: "Ghana",
  gi: "Gibraltar",
  gl: "Greenland",
  gm: "Gambia",
  gn: "Guinea",
  gp: "Guadeloupe",
  gq: "Equatorial Guinea",
  gr: "Greece",
  gs: "South Georgia",
  gt: "Guatemala",
  gu: "Guam",
  gw: "Guinea-Bissau",
  gy: "Guyana",
  hk: "Hong Kong",
  hm: "Heard Island and McDonald Islands",
  hn: "Honduras",
  hr: "Croatia",
  ht: "Haiti",
  hu: "Hungary",
  id: "Indonesia",
  ie: "Ireland",
  il: "Israel",
  im: "Isle of Man",
  in: "India",
  io: "British Indian Ocean Territory",
  iq: "Iraq",
  ir: "Iran",
  is: "Iceland",
  it: "Italy",
  je: "Jersey",
  jm: "Jamaica",
  jo: "Jordan",
  jp: "Japan",
  ke: "Kenya",
  kg: "Kyrgyzstan",
  kh: "Cambodia",
  ki: "Kiribati",
  km: "Comoros",
  kn: "Saint Kitts and Nevis",
  kp: "North Korea",
  kr: "South Korea",
  kw: "Kuwait",
  ky: "Cayman Islands",
  kz: "Kazakhstan",
  la: "Laos",
  lb: "Lebanon",
  lc: "Saint Lucia",
  li: "Liechtenstein",
  lk: "Sri Lanka",
  lr: "Liberia",
  ls: "Lesotho",
  lt: "Lithuania",
  lu: "Luxembourg",
  lv: "Latvia",
  ly: "Libya",
  ma: "Morocco",
  mc: "Monaco",
  md: "Moldova",
  me: "Montenegro",
  mf: "Saint Martin",
  mg: "Madagascar",
  mh: "Marshall Islands",
  mk: "North Macedonia",
  ml: "Mali",
  mm: "Myanmar",
  mn: "Mongolia",
  mo: "Macau",
  mp: "Northern Mariana Islands",
  mq: "Martinique",
  mr: "Mauritania",
  ms: "Montserrat",
  mt: "Malta",
  mu: "Mauritius",
  mv: "Maldives",
  mw: "Malawi",
  mx: "Mexico",
  my: "Malaysia",
  mz: "Mozambique",
  na: "Namibia",
  nc: "New Caledonia",
  ne: "Niger",
  nf: "Norfolk Island",
  ng: "Nigeria",
  ni: "Nicaragua",
  nl: "Netherlands",
  no: "Norway",
  np: "Nepal",
  nr: "Nauru",
  nu: "Niue",
  nz: "New Zealand",
  om: "Oman",
  pa: "Panama",
  pe: "Peru",
  pf: "French Polynesia",
  pg: "Papua New Guinea",
  ph: "Philippines",
  pk: "Pakistan",
  pl: "Poland",
  pm: "Saint Pierre and Miquelon",
  pn: "Pitcairn Islands",
  pr: "Puerto Rico",
  ps: "Palestine",
  pt: "Portugal",
  pw: "Palau",
  py: "Paraguay",
  qa: "Qatar",
  re: "Réunion",
  ro: "Romania",
  rs: "Serbia",
  ru: "Russia",
  rw: "Rwanda",
  sa: "Saudi Arabia",
  sb: "Solomon Islands",
  sc: "Seychelles",
  sd: "Sudan",
  se: "Sweden",
  sg: "Singapore",
  sh: "Saint Helena, Ascension and Tristan da Cunha",
  si: "Slovenia",
  sj: "Svalbard and Jan Mayen",
  sk: "Slovakia",
  sl: "Sierra Leone",
  sm: "San Marino",
  sn: "Senegal",
  so: "Somalia",
  sr: "Suriname",
  ss: "South Sudan",
  st: "São Tomé and Príncipe",
  sv: "El Salvador",
  sx: "Sint Maarten",
  sy: "Syria",
  sz: "Eswatini (Swaziland)",
  tc: "Turks and Caicos Islands",
  td: "Chad",
  tf: "French Southern and Antarctic Lands",
  tg: "Togo",
  th: "Thailand",
  tj: "Tajikistan",
  tk: "Tokelau",
  tl: "Timor-Leste",
  tm: "Turkmenistan",
  tn: "Tunisia",
  to: "Tonga",
  tr: "Turkey",
  tt: "Trinidad and Tobago",
  tv: "Tuvalu",
  tw: "Taiwan",
  tz: "Tanzania",
  ua: "Ukraine",
  ug: "Uganda",
  um: "United States Minor Outlying Islands",
  un: "United Nations",
  us: "United States",
  uy: "Uruguay",
  uz: "Uzbekistan",
  va: "Vatican City (Holy See)",
  vc: "Saint Vincent and the Grenadines",
  ve: "Venezuela",
  vg: "British Virgin Islands",
  vi: "United States Virgin Islands",
  vn: "Vietnam",
  vu: "Vanuatu",
  wf: "Wallis and Futuna",
  ws: "Samoa",
  xk: "Kosovo",
  ye: "Yemen",
  yt: "Mayotte",
  za: "South Africa",
  zm: "Zambia",
  zw: "Zimbabwe",
};

const flag_collectors: Map<
  string,
  InteractionCollector<ButtonInteraction<CacheType>>
> = new Map();

const handleNewFlag = async (
  interaction: InteractionT | ButtonInteraction<CacheType>,
) => {
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

      handleNewFlag(interaction);

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
    flag_collectors.delete(msg.id);

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

  flag_collectors.set(msg.id, collector);
};

let welcome_imgs_order: number[] | null = null;
const guilds = [TEST_GUILD_ID, RANNI_GUILD_ID];

const rest = new REST({ version: "10" }).setToken(TOKEN);

export const tryToGetJackpot = async (user: User, channel: Channel) => {
  if (!channel.isSendable()) return;

  const jackpot = await claimJackpot(user.id);

  if (!jackpot) return;

  await channel.send({
    embeds: [
      new CustomEmbed()
        .setTitle("JACKPOT WINNER 🤑🎉")
        .setDescription(
          `Congratulations ${userMention(user.id)} for winning the jackpot!!\n\nYou got 🪙 ${jackpot.coins.toLocaleString()} coins and 💎${jackpot.gems.toLocaleString()} gems!`,
        )
        .setThumbnail(user.avatarURL())
        .setImage(
          "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdms5ZzdnYXZ0MmxrY2pmbGJiNHYzc21zZDF3dDJnMHBiajNnZG9rdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Sqfu14lSonVN219Zb6/giphy.gif",
        ),
    ],
  });
};

const isGuildValid = (guild: Guild) => {
  return guilds.includes(guild.id);
};

const getWelcomeImgsOrder = async () => {
  const NUM_OF_IMAGES = 19;

  if (!!welcome_imgs_order) {
    welcome_imgs_order = Array.from({ length: NUM_OF_IMAGES })
      .fill(0)
      .map((_, idx) => idx + 1);

    function shuffle(array: any[]) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    welcome_imgs_order = shuffle(welcome_imgs_order);

    await fs.writeFile(
      "src/info.json",
      JSON.stringify(
        {
          welcome_imgs_order,
        },
        null,
        2,
      ),
    );
  } else {
    const info = JSON.parse(await fs.readFile("src/info.json", "utf-8"));
    welcome_imgs_order = info.welcome_imgs_order;

    if (
      !welcome_imgs_order?.length ||
      welcome_imgs_order.length != NUM_OF_IMAGES
    ) {
      welcome_imgs_order = [];
      return await getWelcomeImgsOrder();
    }
  }
};

(async () => {
  try {
    console.log("Registering slash command...");

    for (const guild of guilds)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild), {
        body: commands,
      });

    console.log("Slash command registered.");
  } catch (error) {
    console.error(error);
  }
})();

let lottery: Lottery;
let counting: Counting;
let num_of_members: number;
let twitch: Twitch;
export let ranni_guild: Guild | undefined;

client.once("clientReady", async () => {
  if (process.env.IS_PRODUCTION === "true") new Logger();

  counting = new Counting();
  lottery = new Lottery();
  new Leveling();
  twitch = new Twitch();

  ranni_guild = await client.guilds.fetch(RANNI_GUILD_ID);

  if (!ranni_guild) return;

  await ranni_guild.channels.fetch();

  const members = await ranni_guild.members.fetch();
  num_of_members = members.filter((member) => !member.user.bot).size;

  const emoji = ranni_guild.emojis?.cache?.get("1464281133813596254");

  if (emoji && emoji.available)
    gem_emoji = {
      message: `:${emoji.name}:`,
      embed: `<:${emoji.name}:${emoji.id}>`,
    };

  const twitch_channel = client.channels.cache.get("1311121693133246535");
  const clips_channel = client.channels.cache.get("1387333680141439046");

  if (!twitch_channel?.isSendable()) return;

  let lastProcessedMonth: number = moment().utc().month();
  let last_clip_date = moment().utc();
  let last_announcement = (
    await twitch_channel.messages.fetch({ limit: 5 })
  ).find(({ author }) => author.id == client.user!.id);

  await getWelcomeImgsOrder();

  setInterval(async () => {
    const handleNewMinute = async () => {
      let is_live = false;

      const handleLive = async () => {
        const live = (await twitch.getLive())[0];

        is_live = !!live;

        client.user?.setPresence({
          activities: is_live
            ? [
                {
                  name: `🔴 ${live?.title ?? ""} 🔴`,
                  type: ActivityType.Streaming,
                  url: "https://www.twitch.tv/ranniria",
                },
              ]
            : [],
        });

        if (
          !live ||
          live.thumbnail_url.startsWith(
            "https://static-cdn.jtvnw.net/ttv-static/404_preview",
          )
        ) {
          const embed = last_announcement?.embeds.at(0);

          if (!embed || embed.image?.url.includes("time-table.png")) return;

          const timestamp = moment(embed.timestamp);
          const next_stream =
            STREAM_DAYS[
              (STREAM_DAYS.indexOf(timestamp.day()) + 1) % STREAM_DAYS.length
            ]!;

          const next_stream_timestamp = moment(embed.timestamp)
            .utc()
            .day(next_stream + (next_stream > timestamp.day() ? 0 : 7))
            .hour(17)
            .minute(0)
            .second(0);

          last_announcement = await last_announcement?.edit({
            embeds: [
              new CustomEmbed()
                .setTitle(
                  `<:purplefireemoji:1478027723732553780> JOIN US ON ${next_stream_timestamp.format("dddd").toUpperCase()} 6PM CET <:purplefireemoji:1478027723732553780>`,
                )
                .setFields([
                  ...embed.fields.slice(0, 2),
                  {
                    name: "🕑 Next Stream",
                    value: `<t:${Math.floor(next_stream_timestamp.valueOf() / 1000)}:R>`,
                    inline: true,
                  },
                ])
                .setColor(embed.color)
                .setThumbnail(embed.thumbnail!.url)
                .setImage("attachment://time-table.png")
                .setTimestamp(timestamp.toDate()),
            ],
            files: [
              new AttachmentBuilder(
                await fs.readFile("./assets/time-table.png"),
                {
                  name: "time-table.png",
                },
              ),
            ],
          });

          return;
        }

        const last_timestamp =
          last_announcement?.embeds.at(0)?.timestamp ?? null;

        const has_been_announced = last_timestamp
          ? moment(last_timestamp).isSame(live.started_at)
          : false;

        const props = {
          content: `<@&1311169420457934848>`,
          embeds: [
            new CustomEmbed()
              .setTitle(
                "<:purplefireemoji:1478027723732553780> LIVE NOW <:purplefireemoji:1478027723732553780>",
              )
              .setFields([
                {
                  name: "💬 Title",
                  value: live.title,
                },
                {
                  name: "🕹️ Games",
                  value: `<:valorant:1478018219192356874> Valorant\n\u200b\n\u200b${new Array(
                    5,
                  )
                    .fill(
                      "<a:Raven_Jam:1387726635268182127><a:RavenTwerk:1388053524893401201>",
                    )
                    .join("")}`,
                  inline: true,
                },
                {
                  name: "<:cute_blush:1478017597516681387> Viewers",
                  value: live.viewer_count.toLocaleString(),
                  inline: true,
                },
              ])
              .setColor(0xe4e29e)
              .setThumbnail(
                "https://static-cdn.jtvnw.net/jtv_user_pictures/03e3d2fb-71a6-4c5a-955d-b28d48908d2f-profile_image-300x300.png",
              )
              .setImage(`${live.thumbnail_url}?t=${Date.now()}`)
              .setTimestamp(moment(live.started_at).toDate())
              .setURL("https://twitch.tv/ranniria"),
          ],
        };

        last_announcement = has_been_announced
          ? await last_announcement!.edit(props)
          : await twitch_channel.send(props);
      };

      const handleClips = async () => {
        if (!clips_channel?.isSendable()) return;

        const clips = await twitch.getClips(last_clip_date);

        if (clips.length) last_clip_date = moment(clips.at(-1)!.created_at);

        for (const {
          title,
          creator_name,
          duration,
          thumbnail_url,
          created_at,
          url,
        } of clips)
          await clips_channel.send({
            embeds: [
              new CustomEmbed()
                .setTitle("🎬 NEW CLIP 🎬")
                .setFields([
                  {
                    name: "💬 Title",
                    value: title,
                  },
                  {
                    name: "👤 Creator",
                    value: (() => {
                      const value = pending_clips.get(url) || creator_name;
                      pending_clips.delete(url);

                      return value;
                    })(),
                    inline: true,
                  },
                  {
                    name: "⏰ Duration",
                    value: `${duration} sec`,
                    inline: true,
                  },
                ])
                .setColor(0xe4e29e)
                .setImage(thumbnail_url)
                .setThumbnail(
                  "https://static-cdn.jtvnw.net/jtv_user_pictures/03e3d2fb-71a6-4c5a-955d-b28d48908d2f-profile_image-300x300.png",
                )
                .setTimestamp(moment(created_at).toDate())
                .setURL(url),
            ],
          });
      };

      await handleLive();
      if (is_live) await handleClips();
    };

    const handleNewMonth = async () => {
      if (!ranni_guild) return;

      const now = moment().utc();
      const currentMonth = now.month();

      if (currentMonth === lastProcessedMonth) return;

      lastProcessedMonth = currentMonth;

      await ranni_guild.members.fetch();

      const SERVER_BOOSTER_ROLE_ID = "1311474973948379177";
      const GAMBLING_CHANNEL_ID = "1459659790417399960";

      const boosters =
        Array.from(ranni_guild.members.cache.values()).filter((member) =>
          member.roles.cache.has(SERVER_BOOSTER_ROLE_ID),
        ) ?? [];

      for (const booster of boosters) await addGems(booster.id, 50);

      await (
        client.channels.cache.get(GAMBLING_CHANNEL_ID) as TextChannel
      ).send({
        embeds: [
          new CustomEmbed()
            .setTitle(
              "<:ServerBooster:1390962352924655697> MONTHLY REWARD <:ServerBooster:1390962352924655697>",
            )
            .setDescription("Thank you all for boosting the server 💗")
            .setColor(0xff4de1)
            .setFields([
              {
                name: "👤 Members",
                value: boosters
                  .map((booster) => userMention(booster.id))
                  .join(" "),
              },
              {
                name: "🎁 Gift",
                value: `${gem_emoji.embed} 50`,
              },
            ])
            .setImage(
              "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExanIwcWRjbHZseHF2bm9oM3JpdnphdGl5dXJmMnp5Z3RleGw1ZTdlbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ji3BtQLFZrNRIUJa38/giphy.gif",
            ),
        ],
      });
    };

    await handleNewMinute();
    await handleNewMonth();
  }, 1000 * 60);

  console.log("All set!");
});

client.on("guildCreate", async (guild) => {
  if (isGuildValid(guild)) return;

  await guild.leave();
});

const updateNumOfMembers = async (guild_id: string, dir: 1 | -1 | 0 = 0) => {
  if (guild_id != RANNI_GUILD_ID) return;

  const CHANNEL_ID = "1311508100733472778";

  num_of_members += dir;

  const channel = ranni_guild?.channels.cache.get(CHANNEL_ID);
  if (!channel) return;

  const channel_name_without_number = channel.name.split(":");

  await ranni_guild?.channels.cache
    .get(CHANNEL_ID)
    ?.setName(`${channel_name_without_number}: ${num_of_members}`);
};

client.on("guildMemberAdd", async (member) => {
  await updateNumOfMembers(member.guild.id, 1);
});

client.on("guildMemberRemove", async (member) => {
  await updateNumOfMembers(member.guild.id, -1);
});

const command_types = [
  {
    title: "Command List 😁",
    description:
      "Here is a list of all commands, followed by a `/`\n\nFor any questions, please tag a <@&1310967646136565770>",
    color: 0x05b2f7,
    categories: {
      "📹 Streaming": ["shedule", "time-table", "social-media"],
      "🎖️ Ranking": ["net-worth", "superiors", "rank", "top"],
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
      ],
      // "🌱 Animals": ["zoo", "hunt", "sell", "sacrafice", "lootbox"],
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
      "🫂 Social": ["ship", "curse", "uwuify"],
      "😃 Emotes": Object.keys(emotes),
      "🎬 Actions": Object.keys(actions),
    },
  },
];

const help_embeds = [
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

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "kraa":
        await interaction.reply({
          embeds: [help_embeds[0]!],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              ...help_embeds.map((embed, idx) =>
                new ButtonBuilder()
                  .setCustomId(`help-embed-${idx}`)
                  .setLabel(embed.data.title!)
                  .setStyle(ButtonStyle.Secondary),
              ),
            ),
          ],
        });

        break;

      case "net-worth":
        await interaction.deferReply();

        const user =
          interaction.options.getUser("target", false) ?? interaction.user;

        const data = await getUserCoins(user.id);

        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setTitle("NET WORTH 💰")
              .setFields([
                {
                  name: "👛 Wallet",
                  value: `🪙 ${data.coins.toLocaleString()} coins`,
                  inline: true,
                },
                {
                  name: "🏦 Bank",
                  value: `🪙 ${data.bank.toLocaleString()} coins`,
                  inline: true,
                },
                {
                  name: "🔒 Vault",
                  value: `${gem_emoji.embed} ${data.gems.toLocaleString()} gems`,
                  inline: true,
                },
              ])
              .setDescription("Elon Musk dis u?")
              .setColor(0xfc9630)
              .setThumbnail(user.avatarURL()),
          ],
        });

        break;

      case "duel":
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        new Duel(interaction);

        break;

      case "gamble":
        await validateNotInJail(interaction.user.id);

        if (current_gambles.has(interaction.user.id)) return;

        new Gamble(interaction);

        break;

      case "superiors":
        {
          const result = await getTop5Richest();
          const usernames: Map<string, string> = new Map();

          if (result.length) {
            const FIRST_PLACE_ROLE_ID = "1466805806346535097";

            try {
              const guild = interaction.guild!;

              const role = (await guild.roles.fetch(FIRST_PLACE_ROLE_ID))!;

              const current_first_place = role.members.at(0)!;
              const new_first_place = guild.members.cache.get(
                result.at(0)!.id,
              )!;

              if (current_first_place.id != new_first_place.id) {
                await current_first_place.roles.remove(FIRST_PLACE_ROLE_ID);
                await new_first_place.roles.add(FIRST_PLACE_ROLE_ID);
              }
            } catch (e) {
              console.log(e);
            }
          }

          for (const user of result)
            usernames.set(
              user.id,
              client.users.cache.get(user.id)?.username ?? "",
            );

          await interaction.reply({
            embeds: [
              new CustomEmbed()
                .setTitle("WOW 🤩🤑")
                .setDescription("Give sum for the rest of us mfs")
                .setColor(0x35de35)
                .setImage(
                  "https://content.imageresizer.com/images/memes/huell-money-meme-65w66.jpg",
                )
                .setFields(
                  (await getTop5Richest()).map((user, idx) => ({
                    name: `${
                      idx == 0
                        ? " 🥇"
                        : idx == 1
                          ? " 🥈"
                          : idx == 2
                            ? " 🥉"
                            : ""
                    } ${usernames.get(user.id)}`,
                    value: `👛 ${user.coins.toLocaleString()}\n🏦 ${user.bank.toLocaleString()}\n${gem_emoji.embed} ${user.gems.toLocaleString()} \n💸 ${user.total.toLocaleString()}`,
                    inline: true,
                  })),
                )
                .setThumbnail(
                  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHNjcTY5c3J1cnVlZ3pxamZ0ZHZvdGFqZ2x4N3N6aHIwdnZrZXpqaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MFsqcBSoOKPbjtmvWz/giphy.gif",
                ),
            ],
          });
        }

        break;

      case "donate": {
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        const from = interaction.user;
        const to = interaction.options.getUser("target", true);
        const amount = interaction.options.getNumber("amount", true);

        if (amount < 10) return;

        if (from.id == to.id || to.bot) return;

        if (!(await hasEnoughCoins(interaction.user.id, amount)))
          return await interaction.reply(
            "Thats very sweet, but u cant afford donating this much :(",
          );

        await takeCoins(from.id, amount);
        await addCoins(to.id, Math.floor(amount * 0.9));

        await interaction.reply(
          `WOW YOU ARE SO SWEET ${userMention(from.id)}! ${
            from.displayName
          } gave ${userMention(
            to.id,
          )} ${Math.floor(amount * 0.9).toLocaleString()} coins (10% fee) 🪙\n\n(Exucse me im gonna tear up 🥹)`,
        );

        if (amount >= 50_000)
          await setQuest(interaction.user.id, {
            donate: 1,
          });

        await tryToGetJackpot(from, interaction.channel!);

        break;
      }

      case "daily": {
        await validateNotInJail(interaction.user.id);

        const result = await updateAndReturnDaily(interaction.user.id);

        if (result < 0)
          return await interaction.reply(
            "U ALREADY CLAIMED TODAYS REWARD U GREEDY MF",
          );

        await addCoins(interaction.user.id, result);

        await interaction.reply(
          `NICE! Streak is now ${result.toLocaleString()} days 🔥 You got +${result.toLocaleString()} coins 🪙`,
        );

        await tryToGetJackpot(interaction.user, interaction.channel!);

        break;
      }

      case "steal": {
        await validateNotInJail(interaction.user.id);

        const target = interaction.options.getUser("victim", true);

        if (target.bot || target.id == interaction.user.id) return;

        if (!(await updateTheft(interaction.user.id)))
          return await interaction.reply(
            "DOUBLING DOWN AFTER ALREADY STEALING 2DAY IS CRAZY WORK",
          );

        const can_steal = await getCanStealIn(interaction.user.id);

        if (can_steal && moment().utc().isBefore(can_steal))
          return await interaction.reply({
            content: `You are on the loose!! You can try to steal <t:${Math.floor(can_steal.valueOf() / 1000)}:R>`,
            ephemeral: true,
          });

        if (!(await hasEnoughCoins(target.id, 20)))
          return await interaction.reply(
            "WHY WOULD U WANT TO STEAL PENNIES FIND SOME1 ELSE TO STEAL FROM",
          );

        await setCanStealIn(interaction.user.id, null);

        new Steal(interaction.user, target, interaction);

        break;
      }

      case "store":
        await interaction.reply({
          embeds: Store.getStoreEmbeds(),
        });

        break;

      case "buy": {
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        const value = parseInt(interaction.options.getString("item", true));
        const quantity = interaction.options.getNumber("quantity", false) ?? 1;

        const item = Store.ITEMS.get(value);

        if (!item) return await interaction.reply("INVALID ITEM VALUE");

        const total = item.amount * quantity;

        const data = await getUserCoins(interaction.user.id);

        if (
          (item.currency == Currency.COIN && data.coins < total) ||
          (item.currency == Currency.GEM && data.gems < total)
        )
          return await interaction.reply("U TOO BROKE TO BUY DIS");

        if (value == ItemId.DIAMOND)
          await addGems(interaction.user.id, quantity);
        else if (!(await addItem(interaction.user.id, value, quantity)))
          return await interaction.reply("INVENTORY CAN HAVE MAX 100 ITEMS");

        if (item.currency == Currency.COIN)
          await takeCoins(interaction.user.id, total);
        else await takeGems(interaction.user.id, total);

        const msg = await interaction.reply(
          `SUCCESSFULLY PURCHASED THE ${item.name.toUpperCase()} ${quantity} TIMES FOR ${total.toLocaleString()} ${item.currency == Currency.COIN ? "COINS" : "GEMS"}!!`.replaceAll(
            "💎",
            gem_emoji.message,
          ),
        );

        await tryToGetJackpot(interaction.user, interaction.channel!);

        break;
      }

      case "inventory": {
        const user =
          interaction.options.getUser("target", false) ?? interaction.user;

        const inventory = await getInventory(user.id);
        const inventory_with_amounts = inventory.reduce(
          (prev: Map<number, number>, curr: number) => {
            prev.set(curr, (prev.get(curr) ?? 0) + 1);

            return prev;
          },
          new Map<number, number>(),
        );

        if (!inventory.length)
          return await interaction.reply("YOU HAVE NOTHING");

        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle("BACKPACK 👜")
              .setDescription(
                Array.from(inventory_with_amounts.entries())
                  .map(
                    ([item, quantity]) =>
                      `${Store.ITEMS.get(item)!.name} \`x${quantity.toLocaleString()}\``,
                  )
                  .join("\u200b\n"),
              )
              .setColor(0x85d63a)
              .setThumbnail(user.avatarURL())
              .setImage(
                "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2UyNzlnc2k0eXh6YnczamZ5Ynk1YTducHRrMGMzdml2emJ5b3M1NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/n6yBj4EzqmTHG/giphy.gif",
              ),
          ],
        });

        break;
      }

      case "deposit": {
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        const data = await getUserCoins(interaction.user.id);
        const min = Math.min(
          Math.ceil((data.coins + data.bank + data.gems * 100_000_000) * 0.15),
          500_000_000,
        );

        const amount = Math.max(
          Math.min(
            interaction.options.getNumber("amount", true),
            data.coins - min,
          ),
          0,
        );

        if (amount < 100)
          return await interaction.reply(
            `You must leave 🪙 ${min.toLocaleString()} coins in wallet!`,
          );

        try {
          const takenAmount = await takeCoins(
            interaction.user.id,
            Math.min(data.coins, amount),
          );
          const depositedAmount = await addToBank(
            interaction.user.id,
            takenAmount.diff,
          );

          await interaction.reply(
            `Deposited 🪙 ${depositedAmount.toLocaleString()} into your bank! (5% fee applied)`,
          );
        } catch {
          await interaction.reply(
            "An error occurred during deposit. Please try again.",
          );
        }
        break;
      }

      case "withdraw": {
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        const data = await getUserCoins(interaction.user.id);
        const amount = Math.min(
          interaction.options.getNumber("amount", true),
          data.bank,
        );

        if (amount < 100)
          return await interaction.reply(
            "You dont have enough in bank (min. 🪙 100)",
          );

        const wallet_space = 500_000_000 - data.coins;
        if (wallet_space <= 0)
          return await interaction.reply(
            "Your wallet is full! (Max: 🪙 500,000,000)",
          );

        try {
          const withdrawn_amount = await takeFromBank(
            interaction.user.id,
            Math.min(wallet_space, amount),
          );
          const added_amount = await addCoins(
            interaction.user.id,
            withdrawn_amount,
          );

          await interaction.reply(
            `Withdrew 🪙 ${added_amount.diff.toLocaleString()} into your wallet!`,
          );
        } catch (error) {
          await interaction.reply(
            "An error occurred during withdrawal. Please try again.",
          );
        }
        break;
      }

      case "lottery": {
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        await lottery.handleInteraction(interaction);

        break;
      }

      case "counting-details":
        await counting.sendCountingDetails(interaction);

        break;

      case "trap":
        if (current_gambles.has(interaction.user.id)) return;

        await validateNotInJail(interaction.user.id);

        await counting.trap(interaction);

        break;

      case "jackpot": {
        const jackpot = await getJackpot();

        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle(
                `JACKPOT IS AT 🪙 ${jackpot?.coins.toLocaleString() ?? "0"} AND 💎 ${jackpot?.gems.toLocaleString() ?? "0"}`,
              )
              .setDescription(
                "Go use the bot (count, gamble, level up, duel, buy, claim daily, donate, trap, join lottery), you might win it all...",
              )
              .setColor(0xf5d50a)
              .setImage(
                "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmhjbnAyaGl5N24wZnZ2eHAzMTFyMGcwZ2NhdWU1bGlmcTQ5cnYxcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCdPNT81vlv3y/giphy.gif",
              ),
          ],
        });

        break;
      }

      case "meme": {
        new Meme(interaction);

        break;
      }

      case "rate": {
        const target = interaction.options.getUser("target", true);
        const category = interaction.options.getString("category", true);

        switch (category) {
          case "gay": {
            const result = Math.floor(Math.random() * 101);

            await interaction.reply({
              embeds: [
                new CustomEmbed()
                  .setTitle(
                    "<:Raven_Pride:1387726839895687169> Gayrate <:Raven_Pride:1387726839895687169>",
                  )
                  .setDescription(
                    `${userMention(target.id)} is ${result}% gay 🏳️‍🌈`,
                  )
                  .setColor(0xf772d6),
              ],
            });

            break;
          }

          case "furry": {
            const result = Math.floor(Math.random() * 101);

            await interaction.reply({
              embeds: [
                new CustomEmbed()
                  .setTitle(
                    "<:think:1432750974463643698> Furryrate <:think:1432750974463643698>",
                  )
                  .setDescription(
                    `${userMention(target.id)} is ${result}% furry 😼`,
                  )
                  .setColor(0xfca242),
              ],
            });

            break;
          }

          case "aura": {
            const result = Math.floor(Math.random() * 102) - 1;

            await interaction.reply({
              embeds: [
                new CustomEmbed()
                  .setTitle(
                    "<:pepe_calm:1390954099624775791> Aurarate <:pepe_calm:1390954099624775791>",
                  )
                  .setDescription(
                    `${userMention(target.id)} has ${result == 0 ? "" : getRandomFromArray(["+", "-"])}${result < 0 ? "♾️" : (result * 10).toLocaleString()} aura 🗿`,
                  )
                  .setColor(0xffffff),
              ],
            });

            break;
          }

          case "good boy": {
            const result = Math.floor(Math.random() * 101);

            await interaction.reply({
              embeds: [
                new CustomEmbed()
                  .setTitle(
                    "<:paimonsmug:1432750456031154237> Good boy rate <:paimonsmug:1432750456031154237>",
                  )
                  .setDescription(
                    `${userMention(target.id)} is ${result}% a good boy <:catblush:1391399088884420638>`,
                  )
                  .setColor(0x804aff),
              ],
            });

            break;
          }
        }

        break;
      }

      case "give": {
        await validateNotInJail(interaction.user.id);

        const item = parseInt(interaction.options.getString("item", true));
        const target = interaction.options.getUser("target", true);

        if (target.id == interaction.user.id || target.bot) return;

        if (!(await hasItem(interaction.user.id, item)).success)
          return await interaction.reply("YOU DO NO OWN THAT ITEM");

        if (!(await addItem(target.id, item, 1)))
          return await interaction.reply("TARGET IS CAPPED");

        await useItem(interaction.user.id, item);

        await interaction.reply(
          `${userMention(interaction.user.id)} GAVE ${userMention(target.id)} A ${Store.ITEMS.get(item)?.name}!!!`,
        );

        if (item == ItemId.KEBAB || item == ItemId.BEER)
          await setChecklist(interaction.user.id, {
            send: true,
          });

        await tryToGetJackpot(interaction.user, interaction.channel!);

        break;
      }

      case "mini-me": {
        new MiniMe(interaction);

        break;
      }

      case "convert": {
        await validateNotInJail(interaction.user.id);

        const current_balance = await getUserCoins(interaction.user.id);

        if (!current_balance.gems)
          return await interaction.reply("YOU DONT HAVE ANY GEMS BROKIE");

        const available_space = Math.floor(
          (2_000_000_000 - current_balance.bank) / 100_000_000,
        );

        if (!available_space)
          return await interaction.reply("YOU DONT HAVE ROOM IN UR BANK");

        const amount = Math.min(
          Math.floor(interaction.options.getNumber("amount", true)),
          current_balance.gems,
          available_space,
        );

        await takeGems(interaction.user.id, amount);
        const final_amount = await addToBank(
          interaction.user.id,
          amount * 100_000_000,
          2,
        );

        await interaction.reply(
          `SUCCESSFULLY SOLD ${amount} GEMS!! ${final_amount.toLocaleString()} COINS WERE ADDED TO UR BANK (2% fee)!!`,
        );

        await tryToGetJackpot(interaction.user, interaction.channel!);

        break;
      }

      case "wear": {
        const minime = await getMinime(interaction.user.id);

        if (!minime || !minime["base"])
          return await interaction.reply(
            "You did not unlock your minime! Use /mini-me to unlock it",
          );

        const item = parseInt(interaction.options.getString("item", true));

        if (!(await hasItem(interaction.user.id, item)).success)
          return await interaction.reply("YOU DONT OWN THIS ITEM");

        const { type, item_offset } = Store.getItemType(item);

        await putOnMinime(
          interaction.user.id,
          {
            [type]: item_offset,
          },
          minime,
        );

        await interaction.reply(
          `SUCCESSFULLY WORE ${Store.ITEMS.get(item)?.name}!`,
        );

        break;
      }

      case "flame": {
        new Flame(interaction);

        break;
      }

      case "hide-n-seek": {
        new HideAndSeek(interaction);

        break;
      }

      case "trivia": {
        new Trivia(interaction);

        break;
      }

      case "fbi": {
        const initiator = interaction.user.id;

        await validateNotInJail(initiator);
        const last_steal = await getLastSteal(initiator);

        if (!last_steal)
          return await interaction.reply({
            content: "Hmmm... We cant remember who stole from you last time...",
            ephemeral: true,
          });

        const { amount, theif } = last_steal;

        const pay = Math.ceil(amount / 2);

        if (!(await hasEnoughCoins(initiator, pay)))
          return await interaction.reply({
            content: `It would cost you 🪙 ${pay.toLocaleString()} to hire the FBI for this case...`,
            ephemeral: true,
          });

        await takeCoins(initiator, pay);

        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle("🚔 FBI was recruited 🚔")
              .setDescription(
                `Wow... Its getting serious isnt it...\n${userMention(initiator)} recruited the FBI for 🪙 ${pay.toLocaleString()}\n\nStay tuned, ${userMention(initiator)}, results will be here <t:${Math.floor(moment().add(5, "minutes").valueOf() / 1000)}:R> 🫡`,
              )
              .setFields([
                {
                  name: "😕 Stolen From",
                  value: userMention(initiator),
                  inline: true,
                },
                {
                  name: "💰 Amount Stolen",
                  value: `🪙 ${amount.toLocaleString()}`,
                  inline: true,
                },
              ])
              .setColor(0x192d54)
              .setImage(
                "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjY3aGprbGozOXR3OHQ3azJkdmloaWhkM3BtdjVlNjNrZDRlcXk1ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SV5k9Ulnk9LdgYnjbe/giphy.gif",
              ),
          ],
        });

        await setLastSteal(interaction.user.id, null);

        await new Promise<void>((res) => {
          setTimeout(() => {
            res();
          }, 300_000);
        });

        const is_fbi_successful = getRandomFromArray([true, false])!;

        if (!is_fbi_successful)
          return await interaction.editReply({
            embeds: [
              new CustomEmbed()
                .setTitle("🫢 We are sorry... 🫢")
                .setDescription(
                  `Sorry ${userMention(initiator)}, The FBI could not catch the theif...`,
                )
                .setColor(0xf72d3a)
                .setImage(
                  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExa241Y2p5MGtqY2JhaW91aHdob2pnMWdhMWp2bzJlbXV4aXp1OWowbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uoNADe3KKnGZUlEqPx/giphy.gif",
                ),
            ],
          });

        await addCoins(initiator, amount);
        await putInJail(theif, 60 * 24);

        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setTitle("🚨 WE CAUGHT THE MF 🚨")
              .setDescription(
                `${userMention(initiator)} IT WAS ${userMention(theif)}!!!!! WE CAUGHT EM RUNNING AWAY WITH ALL YOUR PRECIOUS MONEY!!\n\nYou got all of your money (🪙 ${amount.toLocaleString()}) back, and ${userMention(theif)} got put in jail for the next 24 hours`,
              )
              .setColor(0x6ee809)
              .setImage(
                "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmprZWxndzk4ajNoeGVhMXBkOTdldGg2cjQ1dnJnbnVxaXMycnA3MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/80D1Pe1m0jfConCfhn/giphy.gif",
              ),
          ],
        });

        break;
      }

      case "bribe": {
        const jail = await isInJail(interaction.user.id);

        if (!jail)
          return await interaction.reply({
            content: "You arent in jail 🥳",
            ephemeral: true,
          });

        const can_bribe = await getCanBribeIn(interaction.user.id);

        if (can_bribe && moment().utc().isBefore(can_bribe))
          return await interaction.reply({
            content: `You already tried to bribe... Try again <t:${Math.floor(can_bribe.valueOf() / 1000)}:R>`,
            ephemeral: true,
          });

        const time_left = Math.floor(moment().utc().diff(jail, "hours"));

        const min = Math.max(time_left, 1);
        const max = min + Math.max(10, min);

        const amount = interaction.options.getNumber("amount", true);

        if (!hasEnoughGems(interaction.user.id, amount))
          return await interaction.reply({
            content: "You dont have enough gems!",
            ephemeral: true,
          });

        await takeGems(interaction.user.id, amount);

        const chosen = Math.floor(Math.random() * (max - min + 1)) + min;

        if (amount < chosen) {
          await setCanBribeIn(
            interaction.user.id,
            moment().utc().add(2, "hours").toDate(),
          );

          return await interaction.reply({
            embeds: [
              new CustomEmbed()
                .setTitle("😒 Bribe failed 😒")
                .setDescription(
                  "The bribe was not enough... the cruel officer 👮 took the gems for himself, beat you up and put you in solitary confinement <a:animeStressed:1311475923006128129>",
                )
                .setImage(
                  getRandomFromArray([
                    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnJlNDByZG1jdmF0YzVxYTlxM3R6Z2dxOGo4bWF3NXRkMTA4ODBhcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/KbZTtakyTtrPWDaR4i/giphy.gif",
                    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWFmY3R2bnRucjdydHUzN283M2k2d3Vrb2l1MWo2ZmZuNGJraDBnNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cYJcIxrBWk6S5qkqmL/giphy.gif",
                    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDd1OHMyam16a3dyMGRveW1lbG8zNjg2NWNlczR2ZmY1eHc1NXk1MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7VZRBKNtnPLeQQZwZN/giphy.gif",
                    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWZybm13eWtnMGxxbWcyMW12eXkxNXNuYzA5dDNqbmw4OXNnbXpiNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SXZRHrdx9T5xLaowDT/giphy.gif",
                  ])!,
                ),
            ],
          });
        }

        await setCanBribeIn(interaction.user.id, null);
        await clearJail(interaction.user.id);

        await setCanStealIn(interaction.user.id, jail);

        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle("🤑 Bribe successful 🤑")
              .setDescription("YOU ARE ON THE LOOSE!!! Keep a low profile... ")
              .setImage(
                "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExanJxaWNlY3czeHlxdnpyejV3azNpdWRpcGtveG4wMTZvdHo2ZWRjaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/g0PheQ8s8E5Nr2H3pK/giphy.gif",
              ),
          ],
        });

        break;
      }

      case "time-table":
      case "schedule":
        await interaction.reply({
          files: [
            new AttachmentBuilder(
              await fs.readFile("./assets/time-table.png"),
              {
                name: "time-table.png",
              },
            ),
          ],
        });

        break;

      case "social-media":
        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle("ㅤㅤㅤFollow for more content!")
              .setDescription(
                "ㅤㅤㅤㅤ\nㅤㅤㅤㅤ<:Discord:1508507371700355213>│[The Nest](https://discord.com/invite/rannisnest)ㅤㅤㅤㅤ\nㅤㅤㅤㅤ<:Twitch:1508507689888776192>│[ranniria Twitch](https://www.twitch.tv/ranniria)ㅤㅤㅤㅤ\nㅤㅤㅤㅤ<:TikTok:1391249483131654247>│[ranniria TikTok](https://www.tiktok.com/@ranniria)ㅤㅤㅤㅤ\nㅤㅤㅤㅤ<:Twitter:1508517556321910794>│[ranniria Twitter](https://x.com/ranniriia)ㅤㅤㅤㅤ\nㅤㅤㅤㅤ<:Youtube:1505559546905493675>│[ranniria YouTube](https://www.youtube.com/@ranniria)ㅤㅤㅤㅤ\nㅤㅤㅤㅤ<:Instagram:1508507952515121152>│[ranniria Instagram](https://www.instagram.com/ranni.ria/)ㅤㅤㅤㅤ\n",
              )
              .setColor(0x4b23eb),
          ],
        });

        break;

      case "8ball":
        const question = interaction.options.getString("question", true);

        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle(
                getRandomFromArray([
                  "Absolutely!",
                  "Hell nah",
                  "Yeah",
                  "I don't think so",
                  "I'm not sure",
                  "Were u doubting it?",
                  "No way",
                ]),
              )
              .setDescription(`__Question:__ ${question}`)
              .setColor(0xa73bff)
              .setImage(
                "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWoxZWV0NGtlajQ0czByYmh2amY0Y2MxbHNuOWMwMnprZnBuc3FlZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o72F5tx9CEhSDxonC/giphy.gif",
              ),
          ],
        });

        break;

      case "ship":
        const user1 = interaction.options.getUser("user1", true);
        const user2 = interaction.options.getUser("user2", true);

        if (user1.id == user2.id)
          return await interaction.reply({
            content: "You cant enter the same user twice dummy",
            ephemeral: true,
          });

        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle(
                `${user1.username.slice(0, user1.username.length / 2)}${user2.username.slice(user2.username.length / 2)}`,
              )
              .setDescription(
                `What a cute name for ${userMention(user1.id)} and ${userMention(user2.id)} 💞`,
              )
              .setColor(0xf73156)
              .setImage(
                "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWZ3cDZiZWFjMnZiaDh5c3RoNmU5d3ZteDFla3Jjc2ZjODVmMWdpciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/t8xgPfC5oNIRMrNooe/giphy.gif",
              ),
          ],
        });

        break;

      case "define": {
        await interaction.deferReply();
        const term = interaction.options.getString("term", true);
        const res = await fetch(
          `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`,
        );
        const data = (
          (await res.json()) as {
            list: {
              word: string;
              definition: string;
              example: string;
              author: string;
              thumbs_up: number;
              thumbs_down: number;
              permalink: string;
              defid: number;
              written_on: string;
            }[];
          }
        ).list.slice(0, 4);

        if (data.length === 0) {
          await interaction.editReply({
            content: `No definitions found for **${term}** :(`,
          });
          break;
        }

        let page = 0;

        const buildEmbed = (index: number) =>
          new CustomEmbed()
            .setTitle(term)
            .setDescription(
              `${data[index]!.definition}\n\n__Examples:__\n${data[index]!.example}`,
            )
            .setFooter({ text: `Definition ${index + 1} of ${data.length}` })
            .setImage(
              "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTZ3Z3Z6NTE5dDA3Znpvdzc3OXlueHNka21kY21ndzJrbHpqN285OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WoWm8YzFQJg5i/giphy.gif",
            )
            .setColor(0x03befc);

        const buildRow = (index: number) =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("⬅️ Previous")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(index === 0),
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("Next ➡️")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(index === data.length - 1),
          );

        const message = await interaction.editReply({
          embeds: [buildEmbed(page)],
          components: [buildRow(page)],
        });

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 5 * 60 * 1000,
        });

        collector.on("collect", async (btnInteraction) => {
          if (btnInteraction.user.id !== interaction.user.id) {
            await btnInteraction.reply({
              content: "These buttons aren't for you.",
              ephemeral: true,
            });
            return;
          }

          if (btnInteraction.customId === "prev") page--;
          if (btnInteraction.customId === "next") page++;

          await btnInteraction.update({
            embeds: [buildEmbed(page)],
            components: [buildRow(page)],
          });
        });

        collector.on("end", async () => {
          await interaction.editReply({ components: [] });
        });

        break;
      }

      case "uwuify": {
        const message = interaction.options.getString("message");

        await interaction.reply(owo(message));

        break;
      }

      case "roll": {
        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle(
                `🎲 You rolled ${Math.floor(Math.random() * 6) + 1}!! 🎲`,
              )
              .setDescription("What does that mean? idk")
              .setColor(0xeb3446)
              .setImage(
                "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHpsa3UydGppMHVhZXNjMGZzdzJmNm92MHl0Z2lyd24yeWE4ZGptcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/90XuzSWPb6gBa3ciRv/giphy.gif",
              ),
          ],
        });

        break;
      }

      case "coinflip": {
        await interaction.deferReply();

        await validateNotInJail(interaction.user.id);

        const balance = await getUserCoins(interaction.user.id);

        const bet = Math.max(
          Math.min(
            Math.floor(interaction.options.getNumber("bet", true)),
            balance.coins,
          ),
          1,
        );

        if (!(await hasEnoughCoins(interaction.user.id, bet))) {
          await interaction.editReply({
            content: "U A BROKE MF U CANT BET THIS MUCH",
            embeds: [],
            components: [],
            files: [],
          });
          return;
        }

        const choice = interaction.options.getString("choice", true);
        const result = getRandomFromArray(["heads", "tails"]);
        const won = choice == result;

        const msg = `${interaction.user.displayName} spent <:justacoin:1508806637362610287> 1 and chose ${choice}\nThe coin spins...`;

        await interaction.editReply(`${msg} <a:coinflip:1508805014162767932>`);

        await new Promise<void>((res) => {
          setTimeout(() => {
            res();
          }, 2000);
        });

        await addCoins(interaction.user.id, won ? bet : -bet);

        await interaction.editReply(
          `${msg} <:justacoin:1508806637362610287> ${won ? `and you won 🪙 ${bet * 2}!!` : "and you lost it all... :c"}`,
        );

        break;
      }

      case "checklist": {
        await interaction.deferReply();

        const last_date = (
          await prisma.user.findUnique({
            select: {
              last_date: true,
            },
            where: {
              id: interaction.user.id,
            },
          })
        )?.last_date;

        const counting_channel = ranni_guild?.channels.cache.get(
          "1236751657086484587",
        );

        if (!counting_channel?.isSendable()) return;

        const prisma_checklist = await getChecklist(interaction.user.id);

        const checklist: {
          daily: boolean;
          participate: boolean;
          send: boolean;
          quest: boolean;
        } = {
          daily: last_date
            ? moment(last_date).isSame(moment().utc(), "day")
            : false,
          // count:
          //   (
          //     await counting_channel.messages.fetch({
          //       after: generateSnowflake(
          //         moment().utc().startOf("day").toDate(),
          //       ),
          //     })
          //   ).filter(
          //     (msg) =>
          //       msg.author.id == interaction.user.id &&
          //       msg.reactions.cache.some(
          //         (reaction) =>
          //           reaction.emoji.name == "✅" &&
          //           reaction.users.cache.has(client.user!.id),
          //       ),
          //   ).size >= 5,
          participate: prisma_checklist.participate,
          send: prisma_checklist.send,
          quest: Object.entries(await getQuest(interaction.user.id)).every(
            ([key, value]) => {
              const max = quest_details[key as keyof QuestT]?.max;

              if (!max || typeof value != "number") return true;

              return value >= max;
            },
          ),
        };

        const descriptions: Record<keyof typeof checklist, string> = {
          daily: "🎁 You can still claim your daily!",
          // count: "Count 5 numbers in <#1236751657086484587>",
          participate:
            "🥇 Particiapte in a minigame! `(duel, hide-n-seek, trivia)`",
          send: "🥙 Send a <:kebab:1509580422143676427> Kebab or a <:pensivebeer:1509581797967532052> Beer!",
          quest: "📜 You can still claim a quest!",
        };

        const did_finish = Object.values(checklist).every((value) => !!value);

        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setAuthor({
                name: `${interaction.user.displayName}'s Checklist`,
                iconURL:
                  interaction.user.avatarURL() ??
                  "https://preview.redd.it/the-new-discord-default-profile-pictures-v0-tbhgxr7adj7f1.png?width=1024&format=png&auto=webp&s=681455786feb3bb43479cc5d684dd3a3ff664a20",
              })
              .setDescription(
                `${Object.entries(checklist)
                  .map(
                    ([key, value]) =>
                      `${value ? "✅" : "⬛"} ${descriptions[key as keyof typeof checklist]}`,
                  )
                  .join(
                    "\n",
                  )}\n${did_finish ? "✅ 🎉 Nice!! claim today's reward :)" : "⬛ 🎉 Complete your checklist to get a reward!"} `,
              )
              .setColor(0x62d435),
          ],
        });

        break;
      }

      case "kebab": {
        await interaction.deferReply();

        const last_kebab = await getLastKebab(interaction.user.id);
        const today = moment().utc().startOf("day");

        if (last_kebab && !moment(last_kebab).isBefore(today))
          return await interaction.editReply(
            `You already got today's kebab fatty!\n\nYou can claim your next kebab <t:${Math.floor(today.add(1, "day").valueOf() / 1000)}:R>`,
          );

        await interaction.editReply(
          `You got a ${Store.ITEMS.get(ItemId.KEBAB)?.name}!\n\nYou can claim your next kebab <t:${Math.floor(today.add(1, "day").valueOf() / 1000)}:R>`,
        );

        await addItem(interaction.user.id, ItemId.KEBAB, 1);

        break;
      }

      case "beer": {
        await interaction.deferReply();

        const last_beer = await getLastBeer(interaction.user.id);
        const today = moment().utc().startOf("day");

        if (last_beer && !moment(last_beer).isBefore(today))
          return await interaction.editReply(
            `You already got today's beer drunky!\n\nYou can claim your next beer <t:${Math.floor(today.add(1, "day").valueOf() / 1000)}:R>`,
          );

        await interaction.editReply(
          `You got a ${Store.ITEMS.get(ItemId.BEER)?.name}!\n\nYou can claim your next beer <t:${Math.floor(moment().utc().add(1, "day").startOf("day").valueOf() / 1000)}:R>`,
        );

        await addItem(interaction.user.id, ItemId.BEER, 1);

        break;
      }

      case "quest": {
        await interaction.deferReply();

        const prisma_quest = await getQuest(interaction.user.id);

        const quest: Partial<typeof prisma_quest> = prisma_quest;

        delete quest.of;

        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setAuthor({
                name: `${interaction.user.displayName}'s Quest`,
                iconURL:
                  interaction.user.avatarURL() ??
                  "https://preview.redd.it/the-new-discord-default-profile-pictures-v0-tbhgxr7adj7f1.png?width=1024&format=png&auto=webp&s=681455786feb3bb43479cc5d684dd3a3ff664a20",
              })
              .setDescription(
                `${Object.entries(quest)
                  .map(([key, value], idx) => {
                    const details_of_key =
                      quest_details[key as keyof typeof quest];
                    if (!details_of_key || typeof value != "number") return "";
                    return [
                      `${idx + 1}. **${details_of_key.description}**`,
                      `\u200b\u200b\u200b\`- Reward:\``,
                      `\u200b\u200b\u200b\`- Progress: [${Math.min(value, details_of_key.max)}/${details_of_key.max}]\``,
                    ].join("\u200b\n");
                  })
                  .join("\n")}`,
              )
              .setColor(0x34baeb),
          ],
        });

        break;
      }

      case "flag": {
        await handleNewFlag(interaction);

        break;
      }

      default: {
        if (
          interaction.commandName in actions ||
          interaction.commandName in emotes
        ) {
          const data =
            actions[interaction.commandName] ?? emotes[interaction.commandName];

          await interaction.reply({
            embeds: [
              new CustomEmbed()
                .setAuthor({
                  name: getRandomFromArray(data!.titles)!
                    .replace("{name}", interaction.user.displayName)
                    .replace(
                      "{target}",
                      interaction.options.getUser("target")?.displayName ?? "",
                    ),
                  iconURL:
                    interaction.user.avatarURL() ??
                    "https://preview.redd.it/the-new-discord-default-profile-pictures-v0-tbhgxr7adj7f1.png?width=1024&format=png&auto=webp&s=681455786feb3bb43479cc5d684dd3a3ff664a20",
                })
                .setImage(getRandomFromArray(data!.urls)),
            ],
          });
        }
      }
    }
  } catch (e: any) {
    let data: any;

    try {
      data = JSON.parse(e.message);
    } catch {
      console.log(e);
      data =
        "Something went wrong please notify stupid <@609097048662343700> for his poor coding skills";
    }

    if (interaction.replied) await interaction.editReply(data);
    else await interaction.reply(data);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  switch (interaction.channelId) {
    case "1476252282134986814": {
      const fields = interaction.message?.embeds[0]?.data.fields;

      if (!fields) return;

      const [username, content] = fields.map((field) => field.value);

      if (!username || !content) return;

      switch (interaction.customId) {
        case "accept": {
          if (
            username.startsWith("<@") &&
            !interaction.message.attachments.size
          ) {
            const member = ranni_guild!.members.cache.get(
              username.replace("<@", "").replace(">", ""),
            );

            if (!member) return;

            const getCanvas = async (
              fontSize = 28,
              maxWidth = 700,
              padding = 20,
              lineGap = 6,
            ) => {
              const fontFamily = "Inter";

              // -------------------------
              // Resolve user + role color
              // -------------------------
              const username = member.displayName;

              const roleColor =
                member instanceof GuildMember &&
                member.displayHexColor !== "#000000"
                  ? member.displayHexColor
                  : "#ffffff";

              // avatar URL (high quality)
              const avatarURL = member.displayAvatarURL({
                extension: "png",
                size: 256,
              });

              // -------------------------
              // Measure text
              // -------------------------
              const measureCanvas = createCanvas(1, 1);
              const measureCtx = measureCanvas.getContext("2d");

              measureCtx.font = `${fontSize}px ${fontFamily}`;

              const avatarSize = 64;
              const textStartX = padding + avatarSize + 16;

              const words = content.split(" ");
              const lines: string[] = [];

              let currentLine = "";

              for (const word of words) {
                const test = currentLine ? `${currentLine} ${word}` : word;

                const allowedWidth = maxWidth - textStartX - padding;

                if (measureCtx.measureText(test).width > allowedWidth) {
                  lines.push(currentLine);
                  currentLine = word;
                } else {
                  currentLine = test;
                }
              }

              if (currentLine) lines.push(currentLine);

              const metrics = measureCtx.measureText("M");
              const lineHeight =
                metrics.actualBoundingBoxAscent +
                metrics.actualBoundingBoxDescent +
                lineGap;

              const usernameHeight = fontSize + 4;

              const height =
                padding * 2 + usernameHeight + lines.length * lineHeight;

              // -------------------------
              // Create canvas
              // -------------------------
              const canvas = createCanvas(maxWidth, Math.ceil(height));
              const ctx = canvas.getContext("2d");

              ctx.font = `${fontSize}px ${fontFamily}`;
              ctx.textBaseline = "top";

              // Discord dark background
              ctx.fillStyle = "#313338";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // -------------------------
              // Draw avatar
              // -------------------------
              const avatar = await loadImage(avatarURL);

              const avatarX = padding;
              const avatarY = padding;

              // circular avatar
              ctx.save();
              ctx.beginPath();
              ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2,
                0,
                Math.PI * 2,
              );
              ctx.closePath();
              ctx.clip();

              ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
              ctx.restore();

              // -------------------------
              // Username
              // -------------------------
              ctx.fillStyle = roleColor;
              ctx.fillText(username, textStartX, padding);

              // -------------------------
              // Message text
              // -------------------------
              ctx.fillStyle = "#dbdee1";

              let y = padding + usernameHeight;

              for (const line of lines) {
                ctx.fillText(line, textStartX, y);
                y += lineHeight;
              }

              return canvas;
            };

            return await Flame.acceptFlameRequest(
              getCanvas,
              interaction,
              member.displayName,
              content,
              [member.id],
            );
          }

          const modal = new ModalBuilder()
            .setCustomId("flames")
            .setTitle("Who does it flame?");

          const flames_label = new LabelBuilder()
            .setLabel("Who does it flame?")
            .setDescription("Enter the user ID of the person it flames")
            .setUserSelectMenuComponent(
              new UserSelectMenuBuilder()
                .setCustomId("flames_select")
                .setPlaceholder("Select the user it flames")
                .setMinValues(1)
                .setMaxValues(5),
            );

          modal.addComponents(flames_label);

          await interaction.showModal(modal);

          break;
        }

        case "reject":
          await interaction.message.delete();

          await Flame.sendFlameLog(
            {
              username,
              content,
            },
            false,
            interaction.user.id,
          );

          break;
      }
      break;
    }
    default: {
      if (interaction.customId.startsWith("help-embed")) {
        await interaction.message.edit({
          embeds: [
            help_embeds.at(parseInt(interaction.customId.split("-").at(-1)!))!,
          ],
        });

        await interaction.deferUpdate();
      }
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  switch (interaction.customId) {
    case "flames": {
      const selected_users =
        interaction.fields.getSelectedUsers("flames_select");

      if (selected_users == null) return;

      const fields = interaction.message?.embeds[0]?.data.fields;

      if (!fields) return;

      const [username, content] = fields.map((field) => field.value);

      if (!username || !content) return;

      const getCanvas = async (
        fontSize = 28,
        fontFamily = "Inter",
        padding = 20,
        maxWidth = 600,
        lineGap = 8,
      ) => {
        const measureCanvas = createCanvas(1, 1);
        const measureCtx = measureCanvas.getContext("2d");

        measureCtx.font = `${fontSize}px ${fontFamily}`;

        const usernameText = `${username}: `;
        const usernameWidth = measureCtx.measureText(usernameText).width;

        const words = content.split(" ");
        const lines: string[] = [];

        let currentLine = "";
        let isFirstLine = true;

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;

          const allowedWidth = isFirstLine
            ? maxWidth - usernameWidth - padding * 2
            : maxWidth - padding * 2;

          const testWidth = measureCtx.measureText(testLine).width;

          if (testWidth > allowedWidth) {
            lines.push(currentLine);
            currentLine = word;
            isFirstLine = false;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) lines.push(currentLine);

        const metrics = measureCtx.measureText("M");
        const lineHeight =
          metrics.actualBoundingBoxAscent +
          metrics.actualBoundingBoxDescent +
          lineGap;

        const height = padding * 2 + lines.length * lineHeight - lineGap;

        const canvas = createCanvas(maxWidth, Math.ceil(height));
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#18181B";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = "top";

        let y = padding;

        const usernameColor =
          username == "ranniria"
            ? "#9452D3"
            : getRandomFromArray([
                "#1E90FF",
                "#8A2BE2",
                "#ffe600",
                "#ffe600",
                "#2E8B57",
                "#FF69B4",
                "#FF4500",
                "#5F9EA0",
              ])!;

        ctx.fillStyle = usernameColor;
        ctx.fillText(usernameText, padding, y);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(lines[0]!, padding + usernameWidth, y);

        for (let i = 1; i < lines.length; i++) {
          y += lineHeight;
          ctx.fillText(lines[i]!, padding, y);
        }

        return canvas;
      };

      const attachments = interaction.message?.attachments;

      await Flame.acceptFlameRequest(
        getCanvas,
        interaction,
        username,
        attachments && attachments.size
          ? Array.from(attachments.values())
          : content,
        selected_users.map((user) => user.id),
      );

      break;
    }

    default: {
      if (interaction.customId.startsWith("flag")) {
        const [f, ...slug_parts] = interaction.customId.split("-");
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
          flag_collectors.get(interaction.message!.id)?.stop("answered");

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
  }
});

client.on("messageCreate", async (message) => {
  try {
    const YT_MOD_CHANNEL_ID = "1505579123043602433";
    const TIKTOK_MOD_CHANNEL_ID = "1505579181625577634";

    const yt_announcements_channel = client.channels.cache.get(
      "1471080811393716408",
    );

    switch (message.channelId) {
      case Lottery.ANNOUNCEMENTS_CHANNEL_ID:
        await validateNotInJail(message.author.id);

        // await lottery.handleMessage(message);

        break;

      case Counting.COUNTING_CHANNEL_ID:
        await counting.handleMessage(message);

        break;

      case Leveling.CHANNEL_ID:
        if (message.author.id != Leveling.BOT_ID) return;

        await Leveling.handleMessage(message);

        break;

      case YT_MOD_CHANNEL_ID: {
        const last_yt_embed = message.embeds[0];

        if (!last_yt_embed || !yt_announcements_channel?.isSendable()) break;

        const [title, tags] = last_yt_embed.title!.split(/#(.*)/s);

        const is_short = tags?.length;

        const fields = [
          {
            name: "💬 Title",
            value: title!,
          },
        ];

        if (is_short)
          fields.push({
            name: "#️⃣ Tags",
            value: tags!.replaceAll(" #", ", "),
          });

        const payload: MessageCreateOptions = {
          embeds: [
            new CustomEmbed()
              .setTitle(
                `<:youtube:1505559546905493675> NEW ${is_short ? "SHORT" : "YOUTUBE VIDEO"} <:youtube:1505559546905493675>`,
              )
              .setURL(last_yt_embed.url)
              .setFields(fields)
              .setColor(0xff0000)
              .setImage(last_yt_embed.image!.url)
              .setThumbnail(
                "https://yt3.googleusercontent.com/_GUnYS_dKGOhJFlW4Jd84ARG7vAOPFCtFa_qkqbYMZAO-lxMn5udwi9W7tOXomjCwjOPwwSh=s160-c-k-c0x00ffffff-no-rj",
              )
              .setTimestamp(new Date(last_yt_embed.timestamp!)),
          ],
        };

        if (!is_short) payload.content = "<@&1505592084059390044>";

        await yt_announcements_channel.send(payload);

        break;
      }

      case TIKTOK_MOD_CHANNEL_ID: {
        const last_tiktok_embed = message.embeds[0];
        const tiktok_announcements_channel = client.channels.cache.get(
          "1310742192469573712",
        );

        if (
          !last_tiktok_embed ||
          !yt_announcements_channel?.isSendable() ||
          !tiktok_announcements_channel?.isSendable()
        )
          break;

        const [title, tags] = last_tiktok_embed.title!.split(/#(.*)/s);
        const date = new Date(last_tiktok_embed.timestamp!);

        await tiktok_announcements_channel.send({
          content: `<@&1505591983681573056>`,
          embeds: [
            new CustomEmbed()
              .setTitle(
                `<:TikTok:1391249483131654247> NEW TIKTOK <:TikTok:1391249483131654247>`,
              )
              .setURL(last_tiktok_embed.url)
              .setFields([
                {
                  name: "💬 Title",
                  value: title!,
                },
                {
                  name: "#️⃣ Tags",
                  value: tags!.replaceAll(" #", ", "),
                },
              ])
              .setColor(0xff0050)
              .setImage(
                (await yt_announcements_channel.messages.fetch({ limit: 3 }))
                  .filter((el) =>
                    moment(el.embeds[0]?.timestamp).isSame(moment(date), "day"),
                  )
                  .at(0)?.embeds[0]?.image?.url ?? last_tiktok_embed.image!.url,
              )
              .setThumbnail(
                "https://yt3.googleusercontent.com/_GUnYS_dKGOhJFlW4Jd84ARG7vAOPFCtFa_qkqbYMZAO-lxMn5udwi9W7tOXomjCwjOPwwSh=s160-c-k-c0x00ffffff-no-rj",
              )
              .setTimestamp(date),
          ],
        });

        break;
      }
    }
  } catch (e: any) {
    await message.reply(JSON.parse(e.message));
  }
});

client.on("messageCreate", async (message) => {
  if (!(message.content == "!flame" || message.content == "!flaming")) return;

  if (!message.reference) return;

  const replied_to = message.channel.messages.cache.get(
    message.reference.messageId ?? "",
  );

  if (!replied_to) return;

  const attatchments = Array.from(replied_to.attachments.values());

  await Flame.sendFlameRequest(
    userMention(replied_to.author.id),
    attatchments.length ? attatchments : replied_to.content,
  );
});

client.on("messageDelete", async (message) => {
  switch (message.channelId) {
    case Counting.COUNTING_CHANNEL_ID:
      await counting.onMessageDelete(message);

      break;
  }
});

client.on("guildMemberAdd", async (member) => {
  const welcome_channel = ranni_guild?.channels.cache.get(
    "1387493763332571288",
  );

  if (!welcome_channel?.isSendable()) return;

  let last_used_img = parseInt(
    (await welcome_channel.messages.fetch({ limit: 1 }))
      ?.at(0)
      ?.embeds.at(0)
      ?.image?.url.split(".")
      .at(-2)
      ?.split("/")
      .at(-1) ?? "0",
  );

  if (isNaN(last_used_img)) last_used_img = 0;

  if (!welcome_imgs_order) return;

  const new_img_idx =
    ((welcome_imgs_order?.indexOf(last_used_img) ?? -1) + 1) %
    welcome_imgs_order.length;

  if (new_img_idx == 0) await getWelcomeImgsOrder();

  const img_filename = `${welcome_imgs_order[new_img_idx]}.jpg`;

  const img = new AttachmentBuilder(
    await fs.readFile(`./assets/welcome/${img_filename}`),
    {
      name: img_filename,
    },
  );

  await welcome_channel.send({
    content: userMention(member.id),
    embeds: [
      new CustomEmbed()
        .setTitle(`Welcome Comrade ${member.displayName}`)
        .setDescription(
          `\u200b\n<#1336326581915881593>\n- concerning topics\n<#1311105291890196620>\n- for stream schedule\n<#1311121252827664516>\n- for propaganda\n\n<a:evilcat:1432751141254467815> Enjoy your stay mf <a:evilcat:1432751141254467815>`,
        )
        .setThumbnail(member.user.avatarURL())
        .setImage(`attachment://${img_filename}`)
        .setColor(0xff1c37),
    ],
    files: [img],
  });
});

client.on("threadCreate", async (thread) => {
  if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return;

  switch (thread.parent.id) {
    // animals

    case "1310978386688086117":
      await setQuest(thread.ownerId, {
        pet: 1,
      });

      break;

    // food
    case "1393169480984825896":
      await setQuest(thread.ownerId, {
        meal: 1,
      });

      break;

    // art
    case "1310740233117106306":
      await setQuest(thread.ownerId, {
        art: 1,
      });

      break;
  }
});

client.login(TOKEN);

if (process.env.IS_PRODUCTION) new StreamerBot();

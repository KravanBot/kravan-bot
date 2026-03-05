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
  getInventory,
  getJackpot,
  getLastSteal,
  getMinime,
  getTop5Richest,
  getUserCoins,
  hasEnoughCoins,
  hasEnoughGems,
  hasItem,
  isInJail,
  putInJail,
  putOnMinime,
  setCanBribeIn,
  setCanStealIn,
  setLastSteal,
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
import { getRandomFromArray, validateNotInJail } from "./utils/helpers.js";
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

GlobalFonts.registerFromPath("./assets/fonts/Inter.ttf", "Inter");

configDotenv();

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
    .setDescription("Replies with the current count and the highest record"),

  new SlashCommandBuilder()
    .setName("net-worth")
    .setDescription(
      "Get someone's net worth (if not mentioned, it's your net worth)",
    )
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
        .setMinValue(1),
    ),

  new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("We love gambling dont we")
    .addNumberOption((option) =>
      option
        .setName("bet")
        .setDescription("min 1 coin")
        .setRequired(true)
        .setMinValue(1),
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
    .setName("sell")
    .setDescription("Sell your gems and get coins")
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
].map((cmd) => cmd.toJSON());
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

  // client.user?.setPresence({
  //   activities: [
  //     {
  //       name: "bla bla bla",
  //       type: ActivityType.Streaming,
  //       url: "https://www.twitch.tv/yaritaiji",
  //     },
  //   ],
  // });

  if (!twitch_channel?.isSendable()) return;

  let lastProcessedMonth: number = moment().utc().month();
  let last_clip_date = moment().utc();
  let last_announcement = (
    await twitch_channel.messages.fetch({ limit: 5 })
  ).find(({ author }) => author.id == client.user!.id);

  setInterval(async () => {
    const handleNewMinute = async () => {
      let is_live = false;

      const handleLive = async () => {
        const live = (await twitch.getLive())[0];

        is_live = !!live;

        if (
          !live ||
          live.thumbnail_url.startsWith(
            "https://static-cdn.jtvnw.net/ttv-static/404_preview",
          )
        )
          return;

        const last_thumbnail = last_announcement?.embeds
          .at(0)
          ?.image?.url.split("?")
          .at(0);

        const has_been_announced = last_thumbnail == live.thumbnail_url;

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
                  name: "<:valorant:1478018219192356874> Game",
                  value: `${live.game_name}\n\u200b\n\u200b${new Array(5)
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
                      const value = pending_clips.get(url) ?? creator_name;
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

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "kraa":
        await interaction.editReply({
          embeds: [
            new CustomEmbed()
              .setColor(0x05b2f7)
              .setTitle("Free Commands 😁")
              .setDescription(
                "Commands that dont need any money (cuz im generous 😇)",
              )
              .setFields([
                {
                  name: "/kraa",
                  value: "I mean u get the exact same message as rn 🫠",
                },
                {
                  name: "/counting-details",
                  value:
                    "Sending the current count, the current event (counting events are listed in the Actions). If you are unsure what number should you count next, use this command 🙂",
                },
                // {
                //   name: "/wall-of-shame",
                //   value:
                //     "anything bad u dummies do goes here, including:\n- all the people that destroyed counting sequence ❌\n- number of times goober smashed his head against the toilet 🚽",
                // },
                {
                  name: "/net-worth",
                  value: "Check how fat ur wallet is 💰",
                },
              ]),
            new CustomEmbed()
              .setColor(0xf1c232)
              .setTitle("Paid Commands 💸")
              .setDescription(
                "Commands that do cost money (ill send u my paypal 😊)",
              )
              .setFields([
                {
                  name: "/duel",
                  value:
                    "Invite someone to a rock paper scissors. Add a bet so things get a lil spicy 🌶️\n- user - mention the person u wanna SMASH 💥 (costs min 1 coin)",
                },
                {
                  name: "/gamble",
                  value: `Cmon do i really have to explain myself? Its gambling cmon go do it 🕹️ (costs min 1 coin)`,
                },
                {
                  name: "/lottery",
                  value: `Join the lottery during every stream and win some ez money 🎱 (costs ${Lottery.COST} coins)`,
                },
                {
                  name: "/trap",
                  value:
                    "Trap the number in the counting section, with a chance to win some coins 🪤 (costs 10% of the last counted money)",
                },
              ]),

            new CustomEmbed()
              .setColor(0x6c1af0)
              .setTitle("Actions 🛝")
              .setDescription(
                "Kravan actions besides the commands (tecnologia)",
              )
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
                  )} ${userMention("617091659758436516")} ${userMention(
                    "756137226202513449",
                  )} (basically gambled too much)`,
                },
              ]),
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
              .setColor(0x85d63a)
              .setFields(
                Array.from(inventory_with_amounts.entries()).map(
                  ([item, quantity]) => ({
                    name: Store.ITEMS.get(item)!.name,
                    value: `× ${quantity.toLocaleString()}`,
                    inline: true,
                  }),
                ),
              )
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

        await tryToGetJackpot(interaction.user, interaction.channel!);

        break;
      }

      case "mini-me": {
        new MiniMe(interaction);

        break;
      }

      case "sell": {
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
    }
  } catch (e: any) {
    console.log(e.message);
    await interaction.reply(JSON.parse(e.message));
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.channelId != "1476252282134986814") return;

  const fields = interaction.message?.embeds[0]?.data.fields;

  if (!fields) return;

  const [username, content] = fields.map((field) => field.value);

  if (!username || !content) return;

  switch (interaction.customId) {
    case "accept": {
      if (username.startsWith("<@") && !interaction.message.attachments.size) {
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
          member.id,
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
            .setMaxValues(1),
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
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  switch (interaction.customId) {
    case "flames":
      const selected_user =
        interaction.fields.getSelectedUsers("flames_select")?.at(0) ?? null;

      if (selected_user == null) return;

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
        selected_user.id,
      );
  }
});

client.on("messageCreate", async (message) => {
  try {
    switch (message.channelId) {
      case Lottery.ANNOUNCEMENTS_CHANNEL_ID:
        await validateNotInJail(message.author.id);

        await lottery.handleMessage(message);

        break;

      case Counting.COUNTING_CHANNEL_ID:
        await counting.handleMessage(message);

        break;

      case Leveling.CHANNEL_ID:
        if (message.author.id != Leveling.BOT_ID) return;

        await Leveling.handleMessage(message);
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

client.login(TOKEN);

new StreamerBot();

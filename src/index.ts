import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Interaction,
  userMention,
  Guild,
  GuildMemberRoleManager,
} from "discord.js";
import { Counting } from "./actions/counting.js";
import { Duel } from "./actions/duel.js";
import {
  addCoins,
  addGems,
  addItem,
  addToBank,
  getInventory,
  getJackpot,
  getMinime,
  getTop5Richest,
  getUserCoins,
  hasEnoughCoins,
  hasItem,
  isInJail,
  putOnMinime,
  takeCoins,
  takeFromBank,
  takeFromMinime,
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
        .setDescription("The amount you want to donate")
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
          ...["gay", "furry", "aura"].map((el) => ({
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
        .setChoices(
          items_as_string_option.slice(ItemId.START_SHIRTS, ItemId.COUNT),
        )
        .setRequired(true),
    ),
].map((cmd) => cmd.toJSON());
const guilds = [TEST_GUILD_ID, RANNI_GUILD_ID];

const rest = new REST({ version: "10" }).setToken(TOKEN);

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

client.once("clientReady", async () => {
  counting = new Counting();
  lottery = new Lottery();
  new Leveling();

  const emoji = client.guilds.cache
    .get(RANNI_GUILD_ID)
    ?.emojis?.cache?.get("1464281133813596254");

  if (emoji && emoji.available)
    gem_emoji = {
      message: `:${emoji.name}:`,
      embed: `<:${emoji.name}:${emoji.id}>`,
    };

  console.log("All set!");
});

client.on("guildCreate", async (guild) => {
  if (isGuildValid(guild)) return;

  await guild.leave();
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "kraa":
        await interaction.reply({
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
        const user =
          interaction.options.getUser("target", false) ?? interaction.user;

        const data = await getUserCoins(user.id);

        interaction.reply({
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
              await guild.members.fetch();

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
              (await client.users.fetch(user.id)).username,
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

        return await interaction.reply(
          `NICE! Streak is now ${result.toLocaleString()} days 🔥 You got +${result.toLocaleString()} coins 🪙`,
        );
      }

      case "steal": {
        await validateNotInJail(interaction.user.id);

        const target = interaction.options.getUser("victim", true);

        if (target.bot || target.id == interaction.user.id) return;

        if (!(await hasEnoughCoins(target.id, 20))) return;

        if (!(await updateTheft(interaction.user.id))) return;

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

        await interaction.reply(
          `SUCCESSFULLY PURCHASED THE ${item.name.toUpperCase()} ${quantity} TIMES FOR ${total.toLocaleString()} ${item.currency == Currency.COIN ? "COINS" : "GEMS"}!!`.replaceAll(
            "💎",
            gem_emoji.message,
          ),
        );

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

        const amount = interaction.options.getNumber("amount", true);
        const data = await getUserCoins(interaction.user.id);

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

        const amount = interaction.options.getNumber("amount", true);
        const data = await getUserCoins(interaction.user.id);

        if (data.bank < amount)
          return await interaction.reply(
            `You only have 🪙 ${data.bank.toLocaleString()} in your bank!`,
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
        await interaction.reply({
          embeds: [
            new CustomEmbed()
              .setTitle(
                `JACKPOT IS AT 🪙 ${(await getJackpot())?.toLocaleString()}`,
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
        }

        break;
      }

      case "give": {
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

        break;
      }

      case "mini-me": {
        new MiniMe(interaction);

        break;
      }

      case "sell": {
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
    }
  } catch (e: any) {
    await interaction.reply(JSON.parse(e.message));
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

client.on("messageDelete", async (message) => {
  switch (message.channelId) {
    case Counting.COUNTING_CHANNEL_ID:
      await counting.onMessageDelete(message);

      break;
  }
});

client.login(TOKEN);

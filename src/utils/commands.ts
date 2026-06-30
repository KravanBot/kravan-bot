import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ComponentType,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  userMention,
} from "discord.js";
import {
  actions,
  emotes,
  help_embeds,
  items_as_string_option,
  quest_details,
} from "./constants.js";
import { CustomEmbed } from "./embed.js";
import {
  getRandomFromArray,
  validateNotInJail,
  tryToGetJackpot,
} from "./helpers.js";
import {
  addCoins,
  addGems,
  addItem,
  addToBank,
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
  setCanBribeIn,
  setCanStealIn,
  setChecklist,
  setLastSteal,
  setQuest,
  takeCoins,
  takeCurrency,
  takeFromBank,
  takeGems,
  updateAndReturnDaily,
  updateTheft,
  useItem,
} from "../db/prisma.js";
import { ranni_guild } from "../index.js";
import { Duel } from "../actions/duel.js";
import { Gamble } from "../actions/gamble.js";
import moment from "moment";
import { Steal } from "../actions/steal.js";
import { Currency, ItemId, Store } from "../actions/store.js";
import { Meme } from "../actions/meme.js";
import { MiniMe } from "../actions/minime.js";
import { Flame } from "../actions/flame.js";
import { HideAndSeek } from "../actions/hide-n-sick.js";
import { Trivia } from "../actions/trivia.js";
import fs from "fs/promises";
import owo from "@zuzak/owo";
import { Flag } from "../actions/flag.js";
import { KravanCross } from "../actions/kravan-cross.js";

export type CommandT = {
  description: string;

  addOptionsToCommand?: (
    command: SlashCommandBuilder,
  ) => SlashCommandOptionsOnlyBuilder;
  onTrigger: (
    interaction: ChatInputCommandInteraction<CacheType>,
  ) => Promise<void>;
};

const getActionOrEmoteEmbed = (
  key: string,
  initiator: {
    name: string;
    avatar: string | null;
  },
  target?: string,
) => {
  const data =
    actions[key as keyof typeof actions] ?? emotes[key as keyof typeof emotes];

  return new CustomEmbed()
    .setAuthor({
      name: getRandomFromArray(data!.titles)!
        .replace("{name}", initiator.name)
        .replace("{target}", target ?? ""),
      iconURL:
        initiator.avatar ??
        "https://preview.redd.it/the-new-discord-default-profile-pictures-v0-tbhgxr7adj7f1.png?width=1024&format=png&auto=webp&s=681455786feb3bb43479cc5d684dd3a3ff664a20",
    })
    .setImage(getRandomFromArray(data!.urls));
};

export const commands_details = {
  kraa: {
    description: "Replies with help for dummies",

    onTrigger: async (interaction) => {
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
    },
  },

  "counting-details": {
    description:
      "Sends the current count and the current event (counting events are listed in the Actions)",

    onTrigger: async (interaction) => {
      await ranni_guild.activities?.counting.sendCountingDetails(interaction);
    },
  },

  "net-worth": {
    description: "Check how fat someone's wallet is",

    addOptionsToCommand: (command) =>
      command.addUserOption((option) =>
        option
          .setName("target")
          .setDescription("mention the person u wanna check")
          .setRequired(false),
      ),

    onTrigger: async (interaction) => {
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
                value: `${ranni_guild.emojis?.gem.embed} ${data.gems.toLocaleString()} gems`,
                inline: true,
              },
            ])
            .setDescription("Elon Musk dis u?")
            .setColor(0xfc9630)
            .setThumbnail(user.avatarURL()),
        ],
      });
    },
  },

  duel: {
    description: "Invite someone to a rock paper scissors, with a bet",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      await validateNotInJail(interaction.user.id);

      new Duel(interaction);
    },
  },

  gamble: {
    description: "We love gambling dont we",

    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("bet")
          .setDescription("min 1 coin")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(500_000_000),
      ),

    onTrigger: async (interaction) => {
      await validateNotInJail(interaction.user.id);

      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      new Gamble(interaction);
    },
  },

  superiors: {
    description: "Top 5 richest users on the server",

    onTrigger: async (interaction) => {
      const result = await getTop5Richest();
      const usernames: Map<string, string> = new Map();

      if (result.length) {
        const FIRST_PLACE_ROLE_ID = "1466805806346535097";

        try {
          const guild = interaction.guild!;
          const role = (await guild.roles.fetch(FIRST_PLACE_ROLE_ID))!;
          const current_first_place = role.members.at(0)!;
          const new_first_place = guild.members.cache.get(result.at(0)!.id)!;

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
          ranni_guild.members?.cache.get(user.id)?.displayName ?? "",
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
                  idx == 0 ? " 🥇" : idx == 1 ? " 🥈" : idx == 2 ? " 🥉" : ""
                } ${usernames.get(user.id)}`,
                value: `👛 ${user.coins.toLocaleString()}\n🏦 ${user.bank.toLocaleString()}\n${ranni_guild.emojis?.gem.embed} ${user.gems.toLocaleString()} \n💸 ${user.total.toLocaleString()}`,
                inline: true,
              })),
            )
            .setThumbnail(
              "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHNjcTY5c3J1cnVlZ3pxamZ0ZHZvdGFqZ2x4N3N6aHIwdnZrZXpqaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MFsqcBSoOKPbjtmvWz/giphy.gif",
            ),
        ],
      });
    },
  },

  donate: {
    description: "People are desperate around here...",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      await validateNotInJail(interaction.user.id);

      const from = interaction.user;
      const to = interaction.options.getUser("target", true);
      const amount = interaction.options.getNumber("amount", true);

      if (amount < 10) return;
      if (from.id == to.id || to.bot) return;

      if (!(await hasEnoughCoins(interaction.user.id, amount))) {
        await interaction.reply({
          content: "Thats very sweet, but u cant afford donating this much :(",
          ephemeral: true,
        });
        return;
      }

      await takeCoins(from.id, amount);
      await addCoins(to.id, Math.floor(amount * 0.9));

      await interaction.reply(
        `WOW YOU ARE SO SWEET ${userMention(from.id)}! ${from.displayName} gave ${userMention(to.id)} ${Math.floor(amount * 0.9).toLocaleString()} coins (10% fee) 🪙\n\n(Exucse me im gonna tear up 🥹)`,
      );

      if (amount >= 50_000) await setQuest(interaction.user.id, { donate: 1 });

      await tryToGetJackpot(from, interaction.channel!);
    },
  },

  daily: {
    description: "Claim your daily reward",

    onTrigger: async (interaction) => {
      await validateNotInJail(interaction.user.id);

      const result = await updateAndReturnDaily(interaction.user.id);

      if (result < 0) {
        await interaction.reply("U ALREADY CLAIMED TODAYS REWARD U GREEDY MF");
        return;
      }

      await addCoins(interaction.user.id, result);

      await interaction.reply(
        `NICE! Streak is now ${result.toLocaleString()} days 🔥 You got +${result.toLocaleString()} coins 🪙`,
      );

      await tryToGetJackpot(interaction.user, interaction.channel!);
    },
  },

  steal: {
    description:
      '"Borrow" from someone just a few coins... Be careful not to get caught...',

    addOptionsToCommand: (command) =>
      command.addUserOption((option) =>
        option
          .setName("victim")
          .setDescription("mention the person u wanna borrow from")
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      await validateNotInJail(interaction.user.id);

      const target = interaction.options.getUser("victim", true);

      if (target.bot || target.id == interaction.user.id) return;

      if (!(await updateTheft(interaction.user.id))) {
        await interaction.reply(
          "DOUBLING DOWN AFTER ALREADY STEALING 2DAY IS CRAZY WORK",
        );
        return;
      }

      const can_steal = await getCanStealIn(interaction.user.id);

      if (can_steal && moment().utc().isBefore(can_steal)) {
        await interaction.reply({
          content: `You are on the loose!! You can try to steal <t:${Math.floor(can_steal.valueOf() / 1000)}:R>`,
          ephemeral: true,
        });
        return;
      }

      if (!(await hasEnoughCoins(target.id, 20))) {
        await interaction.reply(
          "WHY WOULD U WANT TO STEAL PENNIES FIND SOME1 ELSE TO STEAL FROM",
        );
        return;
      }

      await setCanStealIn(interaction.user.id, null);

      new Steal(interaction.user, target, interaction);
    },
  },

  store: {
    description: "Display the shop",

    onTrigger: async (interaction) => {
      await interaction.reply({
        embeds: Store.getStoreEmbeds(),
      });
    },
  },

  buy: {
    description: "Buy something from the shop",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      await validateNotInJail(interaction.user.id);

      const value = parseInt(interaction.options.getString("item", true));
      const quantity = interaction.options.getNumber("quantity", false) ?? 1;

      const item = Store.ITEMS.get(value);

      if (!item) {
        await interaction.reply("INVALID ITEM VALUE");
        return;
      }

      const total = item.amount * quantity;
      const data = await getUserCoins(interaction.user.id);

      if (
        (item.currency == Currency.COIN && data.coins < total) ||
        (item.currency == Currency.GEM && data.gems < total)
      ) {
        await interaction.reply("U TOO BROKE TO BUY DIS");
        return;
      }

      if (value == ItemId.DIAMOND) await addGems(interaction.user.id, quantity);
      else if (!(await addItem(interaction.user.id, value, quantity))) {
        await interaction.reply("INVENTORY CAN HAVE MAX 100 ITEMS");
        return;
      }

      takeCurrency(interaction.user.id, total, item.currency);

      await interaction.reply(
        `SUCCESSFULLY PURCHASED THE ${item.name.toUpperCase()} ${quantity} TIMES FOR ${total.toLocaleString()} ${item.currency == Currency.COIN ? "COINS" : "GEMS"}!!`.replaceAll(
          "💎",
          ranni_guild.emojis?.gem.message ?? "💎",
        ),
      );

      await tryToGetJackpot(interaction.user, interaction.channel!);
    },
  },

  give: {
    description: "Give an item to someone",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      await validateNotInJail(interaction.user.id);

      const item = parseInt(interaction.options.getString("item", true));
      const target = interaction.options.getUser("target", true);

      if (target.id == interaction.user.id || target.bot) return;

      if (!(await hasItem(interaction.user.id, item)).success) {
        await interaction.reply("YOU DO NO OWN THAT ITEM");
        return;
      }

      if (!(await addItem(target.id, item, 1))) {
        await interaction.reply("TARGET IS CAPPED");
        return;
      }

      await useItem(interaction.user.id, item);

      await interaction.reply(
        `${userMention(interaction.user.id)} GAVE ${userMention(target.id)} A ${Store.ITEMS.get(item)?.name}!!!`,
      );

      if (item == ItemId.KEBAB || item == ItemId.BEER)
        await setChecklist(interaction.user.id, { send: true });

      await tryToGetJackpot(interaction.user, interaction.channel!);
    },
  },

  inventory: {
    description: "Show your inventory",

    addOptionsToCommand: (command) =>
      command.addUserOption((option) =>
        option
          .setName("target")
          .setDescription("mention the person u wanna SMASH"),
      ),

    onTrigger: async (interaction) => {
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

      if (!inventory.length) {
        await interaction.reply({
          content: "USER HAS NOTHING",
          ephemeral: true,
        });
        return;
      }

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
    },
  },

  deposit: {
    description: "Deposit money from your wallet",

    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("The amount to deposit")
          .setMinValue(100)
          .setMaxValue(500_000_000)
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

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

      if (amount < 100) {
        await interaction.reply(
          `You must leave 🪙 ${min.toLocaleString()} coins in wallet!`,
        );
        return;
      }

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
    },
  },

  withdraw: {
    description: "Withdraw money from your bank",

    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("The amount to withdraw")
          .setMinValue(100)
          .setMaxValue(500_000_000)
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      await validateNotInJail(interaction.user.id);

      const data = await getUserCoins(interaction.user.id);
      const amount = Math.min(
        interaction.options.getNumber("amount", true),
        data.bank,
      );

      if (amount < 100) {
        await interaction.reply({
          content: "You dont have enough in bank (min. 🪙 100)",
          ephemeral: true,
        });
        return;
      }

      const wallet_space = 500_000_000 - data.coins;
      if (wallet_space <= 0) {
        await interaction.reply({
          content: "Your wallet is full! (Max: 🪙 500,000,000)",
          ephemeral: true,
        });
        return;
      }

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
    },
  },

  lottery: {
    description: "Join the current lottery",

    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("answer")
          .setDescription("Your answer to the question")
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      await validateNotInJail(interaction.user.id);

      await ranni_guild.activities?.lottery.handleInteraction(interaction);
    },
  },

  trap: {
    description: "Trap the previous number",

    onTrigger: async (interaction) => {
      if (Gamble.CURRENT_GAMBLES.has(interaction.user.id)) return;

      await validateNotInJail(interaction.user.id);

      await ranni_guild.activities?.counting.trap(interaction);
    },
  },

  jackpot: {
    description: "Get the current jackpot",

    onTrigger: async (interaction) => {
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
    },
  },

  meme: {
    description: "Generate a meme",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      new Meme(interaction);
    },
  },

  rate: {
    description: "Rate a person by some category",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
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
    },
  },

  "mini-me": {
    description: "The user's mini-me",

    addOptionsToCommand: (command) =>
      command.addUserOption((option) =>
        option
          .setName("target")
          .setDescription("mention the person u want to see their mini-me"),
      ),

    onTrigger: async (interaction) => {
      new MiniMe(interaction);
    },
  },

  convert: {
    description: "convert your gems and get coins",

    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("The amount of gems you want to convert")
          .setMinValue(1)
          .setMaxValue(20)
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      await validateNotInJail(interaction.user.id);

      const current_balance = await getUserCoins(interaction.user.id);

      if (!current_balance.gems) {
        await interaction.reply({
          content: "YOU DONT HAVE ANY GEMS BROKIE",
          ephemeral: true,
        });
        return;
      }

      const available_space = Math.floor(
        (2_000_000_000 - current_balance.bank) / 100_000_000,
      );

      if (!available_space) {
        await interaction.reply({
          content: "YOU DONT HAVE ROOM IN UR BANK",
          ephemeral: true,
        });
        return;
      }

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
    },
  },

  wear: {
    description: "Put an item on your mini-me",

    addOptionsToCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("item")
          .setDescription("The item to put")
          .setChoices(items_as_string_option.slice(ItemId.START_SHIRTS))
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      const minime = await getMinime(interaction.user.id);

      if (!minime || !minime["base"]) {
        await interaction.reply({
          content: "You did not unlock your minime! Use /mini-me to unlock it",
          ephemeral: true,
        });
        return;
      }

      const item = parseInt(interaction.options.getString("item", true));

      if (!(await hasItem(interaction.user.id, item)).success) {
        await interaction.reply({
          content: "YOU DONT OWN THIS ITEM",
          ephemeral: true,
        });
        return;
      }

      const { type, item_offset } = Store.getItemType(item);

      await putOnMinime(interaction.user.id, { [type]: item_offset }, minime);

      await interaction.reply(
        `SUCCESSFULLY WORE ${Store.ITEMS.get(item)?.name}!`,
      );
    },
  },

  flame: {
    description: "Get a flaming of a member of the server",

    addOptionsToCommand: (command) =>
      command.addUserOption((option) =>
        option.setName("target").setDescription("The member to flame"),
      ),

    onTrigger: async (interaction) => {
      new Flame(interaction);
    },
  },

  "hide-n-seek": {
    description: "Play hide and seek with fellow members",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      new HideAndSeek(interaction);
    },
  },

  trivia: {
    description: "Play a trivia game with fellow members",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      new Trivia(interaction);
    },
  },

  fbi: {
    description: "Pay the FBI to find (maybe) who stole from you last!",

    onTrigger: async (interaction) => {
      const initiator = interaction.user.id;

      await validateNotInJail(initiator);

      const last_steal = await getLastSteal(initiator);

      if (!last_steal) {
        await interaction.reply({
          content: "Hmmm... We cant remember who stole from you last time...",
          ephemeral: true,
        });
        return;
      }

      const { amount, theif } = last_steal;
      const pay = Math.ceil(amount / 2);

      if (!(await hasEnoughCoins(initiator, pay))) {
        await interaction.reply({
          content: `It would cost you 🪙 ${pay.toLocaleString()} to hire the FBI for this case...`,
          ephemeral: true,
        });
        return;
      }

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
        setTimeout(() => res(), 300_000);
      });

      const is_fbi_successful = getRandomFromArray([true, false])!;

      if (!is_fbi_successful) {
        await interaction.editReply({
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
        return;
      }

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
    },
  },

  bribe: {
    description: "Got caught? try bribing the police...",

    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("amount")
          .setDescription("The amount to bribe")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(50),
      ),

    onTrigger: async (interaction) => {
      const jail = await isInJail(interaction.user.id);

      if (!jail) {
        await interaction.reply({
          content: "You arent in jail 🥳",
          ephemeral: true,
        });
        return;
      }

      const can_bribe = await getCanBribeIn(interaction.user.id);

      if (can_bribe && moment().utc().isBefore(can_bribe)) {
        await interaction.reply({
          content: `You already tried to bribe... Try again <t:${Math.floor(can_bribe.valueOf() / 1000)}:R>`,
          ephemeral: true,
        });
        return;
      }

      const time_left = Math.floor(moment().utc().diff(jail, "hours"));
      const min = Math.max(time_left, 1);
      const max = min + Math.max(10, min);

      const amount = interaction.options.getNumber("amount", true);

      if (!hasEnoughGems(interaction.user.id, amount)) {
        await interaction.reply({
          content: "You dont have enough gems!",
          ephemeral: true,
        });
        return;
      }

      await takeGems(interaction.user.id, amount);

      const chosen = Math.floor(Math.random() * (max - min + 1)) + min;

      if (amount < chosen) {
        await setCanBribeIn(
          interaction.user.id,
          moment().utc().add(2, "hours").toDate(),
        );

        await interaction.reply({
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

        return;
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
    },
  },

  "time-table": {
    description: "Get the weekly time table",

    onTrigger: async (interaction) => {
      await interaction.reply({
        files: [
          new AttachmentBuilder(await fs.readFile("./assets/time-table.png"), {
            name: "time-table.png",
          }),
        ],
      });
    },
  },

  schedule: {
    description: "Get the weekly schedule",

    onTrigger: async (interaction) => {
      await interaction.reply({
        files: [
          new AttachmentBuilder(await fs.readFile("./assets/time-table.png"), {
            name: "time-table.png",
          }),
        ],
      });
    },
  },

  "social-media": {
    description: "Get all of the social media links",

    onTrigger: async (interaction) => {
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
    },
  },

  "8ball": {
    description: "Your personal prophet",

    addOptionsToCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("question")
          .setDescription("Well, your question")
          .setMinLength(2)
          .setMaxLength(50)
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
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
    },
  },

  ship: {
    description: "Ship two members together!",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
      const user1 = interaction.options.getUser("user1", true);
      const user2 = interaction.options.getUser("user2", true);

      if (user1.id == user2.id) {
        await interaction.reply({
          content: "You cant enter the same user twice dummy",
          ephemeral: true,
        });
        return;
      }

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
    },
  },

  define: {
    description: "Get a definition of a term",

    addOptionsToCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("term")
          .setDescription("The term to get definitions of")
          .setMinLength(2)
          .setMaxLength(20)
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      await interaction.deferReply();

      const term = interaction.options.getString("term", true);
      let data: {
        definition: string;
        example: string;
      }[];

      const is_ranni =
        term.toLowerCase() == "ranni" || term.toLowerCase() == "ranniria";

      if (is_ranni) {
        data = [
          {
            definition: "BEST STREAMER EVERRRRRR",
            example: "Is that [ranni] the streamer??",
          },
        ];
      } else {
        const res = await fetch(
          `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`,
        );
        data = (
          (await res.json()) as {
            list: {
              definition: string;
              example: string;
            }[];
          }
        ).list.slice(0, 4);
      }

      if (data.length === 0) {
        await interaction.editReply({
          content: `No definitions found for **${term}** :(`,
        });
        return;
      }

      let page = 0;

      const buildEmbed = (index: number) => {
        let embed = new CustomEmbed()
          .setTitle(term)
          .setDescription(
            `${data[index]!.definition}\n\n__Examples:__\n${data[index]!.example}`,
          )
          .setImage(
            is_ranni
              ? "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXdyOW9ncGx2NHp1b2p4aWxoN2pjZTY4bzBxYjZ3NG5kZGJiemhlaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PYXFld8AhGu1sHEsRl/giphy.gif"
              : "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTZ3Z3Z6NTE5dDA3Znpvdzc3OXlueHNka21kY21ndzJrbHpqN285OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WoWm8YzFQJg5i/giphy.gif",
          )
          .setColor(0x03befc);

        if (!is_ranni)
          embed = embed.setFooter({
            text: "Responses are taken from urbandictionary.com, if you see anything against the rules skip it, we do not have control over the results",
            iconURL:
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXn68hopaLeIuzpo61bwT43RNwYWT01yDiMQ&s",
          });

        return embed;
      };

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
    },
  },

  uwuify: {
    description: "Transform a message to an uwu form",

    addOptionsToCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("message")
          .setDescription("The message to transform")
          .setMinLength(2)
          .setMaxLength(50)
          .setRequired(true),
      ),

    onTrigger: async (interaction) => {
      const message = interaction.options.getString("message");

      await interaction.reply(owo(message));
    },
  },

  roll: {
    description: "Roll a 6 sided dice",

    onTrigger: async (interaction) => {
      await interaction.reply({
        embeds: [
          new CustomEmbed()
            .setTitle(`🎲 You rolled ${Math.floor(Math.random() * 6) + 1}!! 🎲`)
            .setDescription("What does that mean? idk")
            .setColor(0xeb3446)
            .setImage(
              "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHpsa3UydGppMHVhZXNjMGZzdzJmNm92MHl0Z2lyd24yeWE4ZGptcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/90XuzSWPb6gBa3ciRv/giphy.gif",
            ),
        ],
      });
    },
  },

  coinflip: {
    description: "Gamble on a coin flip",

    addOptionsToCommand: (command) =>
      command
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

    onTrigger: async (interaction) => {
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
        setTimeout(() => res(), 2000);
      });

      await addCoins(interaction.user.id, won ? bet : -bet);

      await interaction.editReply(
        `${msg} <:justacoin:1508806637362610287> ${won ? `and you won 🪙 ${bet * 2}!!` : "and you lost it all... :c"}`,
      );
    },
  },

  checklist: {
    description: "Get your checklist of the day",

    onTrigger: async (interaction) => {
      await interaction.deferReply();

      const last_date = (
        await prisma.user.findUnique({
          select: { last_date: true },
          where: { id: interaction.user.id },
        })
      )?.last_date;

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
    },
  },

  quest: {
    description: "Get your quest of the day",

    onTrigger: async (interaction) => {
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

                  const did_finish = value >= details_of_key.max;

                  return [
                    `${idx + 1}. **${details_of_key.description}**`,
                    `\u200b\u200b\u200b\`‣ Reward:\` ${did_finish ? "🥳 Collected" : `${details_of_key.reward.currency == Currency.COIN ? "<a:goldencoin:1311863385922736148>" : ranni_guild.emojis?.gem.embed} ${details_of_key.reward.amount}`}`,
                    `\u200b\u200b\u200b\`‣ Progress: [${Math.min(value, details_of_key.max)}/${details_of_key.max}]\``,
                  ].join("\u200b\n");
                })
                .join("\n")}`,
            )
            .setColor(0x34baeb),
        ],
      });
    },
  },

  kebab: {
    description: "Cook a kebab",

    onTrigger: async (interaction) => {
      await interaction.deferReply();

      const last_kebab = await getLastKebab(interaction.user.id);
      const today = moment().utc().startOf("day");

      if (last_kebab && !moment(last_kebab).isBefore(today)) {
        await interaction.editReply(
          `You already got today's kebab fatty!\n\nYou can claim your next kebab <t:${Math.floor(today.add(1, "day").valueOf() / 1000)}:R>`,
        );
        return;
      }

      await interaction.editReply(
        `You got a ${Store.ITEMS.get(ItemId.KEBAB)?.name}!\n\nYou can claim your next kebab <t:${Math.floor(today.add(1, "day").valueOf() / 1000)}:R>`.replaceAll(
          "🥙",
          "<:kebab:1509580422143676427>",
        ),
      );

      await addItem(interaction.user.id, ItemId.KEBAB, 1);
    },
  },

  beer: {
    description: "Make a beer",

    onTrigger: async (interaction) => {
      await interaction.deferReply();

      const last_beer = await getLastBeer(interaction.user.id);
      const today = moment().utc().startOf("day");

      if (last_beer && !moment(last_beer).isBefore(today)) {
        await interaction.editReply(
          `You already got today's beer drunky!\n\nYou can claim your next beer <t:${Math.floor(today.add(1, "day").valueOf() / 1000)}:R>`,
        );
        return;
      }

      await interaction.editReply(
        `You got a ${Store.ITEMS.get(ItemId.BEER)?.name}!\n\nYou can claim your next beer <t:${Math.floor(moment().utc().add(1, "day").startOf("day").valueOf() / 1000)}:R>`.replaceAll(
          "🍺",
          "<:pensivebeer:1509581797967532052>",
        ),
      );

      await addItem(interaction.user.id, ItemId.BEER, 1);
    },
  },

  flag: {
    description: "Get a random flag and guess it!",

    onTrigger: async (interaction) => {
      await Flag.handleNewFlag(interaction);
    },
  },

  "kravan-cross": {
    description: "Help kravan cross the clouds path",
    addOptionsToCommand: (command) =>
      command.addNumberOption((option) =>
        option
          .setName("bet")
          .setDescription("min 10 coin")
          .setRequired(true)
          .setMinValue(10)
          .setMaxValue(500_000_000),
      ),

    onTrigger: async (interaction) => {
      new KravanCross(interaction);
    },
  },

  ...Object.keys(emotes).reduce(
    (prev: Record<string, CommandT>, cur) => ({
      ...prev,
      [cur]: {
        description: `A ${cur} emote`,

        onTrigger: async (interaction) => {
          await interaction.reply({
            embeds: [
              getActionOrEmoteEmbed(cur, {
                name: interaction.user.displayName,
                avatar: interaction.user.avatarURL(),
              }),
            ],
          });
        },
      },
    }),
    {},
  ),

  ...Object.keys(actions).reduce(
    (prev: Record<string, CommandT>, cur) => ({
      ...prev,
      [cur]: {
        description: `A ${cur} action`,

        addOptionsToCommand: (command) =>
          command.addUserOption((option) =>
            option
              .setName("target")
              .setDescription("The target of the action")
              .setRequired(true),
          ),

        onTrigger: async (interaction) => {
          await interaction.reply({
            embeds: [
              getActionOrEmoteEmbed(
                cur,
                {
                  name: interaction.user.displayName,
                  avatar: interaction.user.avatarURL(),
                },
                interaction.options.getUser("target")?.displayName,
              ),
            ],
          });
        },
      } as CommandT,
    }),
    {},
  ),
} satisfies Record<string, CommandT>;

export const commands = Object.entries(commands_details).map(
  ([slug, details]: [string, CommandT]) => {
    const command = new SlashCommandBuilder()
      .setName(slug)
      .setDescription(details.description);

    if (details.addOptionsToCommand)
      return details.addOptionsToCommand(command).toJSON();

    return command.toJSON();
  },
);

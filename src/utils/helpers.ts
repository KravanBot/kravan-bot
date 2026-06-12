import { Channel, Message, TextChannel, User, userMention } from "discord.js";
import { client, ranni_guild } from "../index.js";
import { addGems, claimJackpot, isInJail } from "../db/prisma.js";
import { CustomEmbed } from "./embed.js";
import moment from "moment";

export const getRandomFromArray = <T>(arr: T[]): T | null => {
  if (!arr.length) return null;

  return arr[Math.floor(Math.random() * arr.length)]!;
};

export const goThroughAllMessages = async (
  channel_id: string,
  action: (msg: MapIterator<Message<true>>) => Promise<boolean>,
) => {
  const counting_channel = client.channels.cache.get(channel_id) as TextChannel;

  let last_id;

  while (true) {
    const options: { limit: number; before?: string } = {
      limit: 100,
    };

    if (last_id) options.before = last_id;

    const messages = await counting_channel.messages.fetch(options);

    const can_continue = await action(messages.values());

    if (messages.size < 100 || !can_continue) break;

    last_id = messages.lastKey();
  }
};

export const truncateNumber = (num: string | number, dec = 2) => {
  const str = String(num);
  const decimal_index = str.indexOf(".");

  if (decimal_index === -1) return parseInt(str);

  const endIndex = decimal_index + dec + 1;
  return parseFloat(str.substring(0, endIndex));
};

export const diffInMinutes = (date1: Date, date2: Date) => {
  const diff_in_ms = date2.valueOf() - date1.valueOf();

  const diff_in_minutes = diff_in_ms / 60000;

  return Math.abs(diff_in_minutes);
};

export const diffInDays = (date1: Date, date2: Date) => {
  return diffInMinutes(date1, date2) / 60 / 24;
};

export const convertToNumber = (str: string) => {
  if (!/^-?\d+(\.\d+)?$/.test(str)) return NaN;

  return parseInt(str);
};

export const validateNotInJail = async (id: string) => {
  const jail_date = await isInJail(id);

  if (jail_date)
    throw new Error(
      JSON.stringify(
        `U IN JAIL 😠!! U GET RELEASED <t:${Math.floor(jail_date.valueOf() / 1000)}:R>`,
      ),
    );
};

export const generateSnowflake = (date: Date) => {
  const DISCORD_EPOCH = 1420070400000n;
  const timestamp = BigInt(date.getTime());
  return ((timestamp - DISCORD_EPOCH) << 22n).toString();
};

export const getFlagNameVariants = (name: string) => {
  const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*(.*)$/);

  if (!match) return [name];

  const before = match[1]?.trim();
  const inside = match[2]?.trim();
  const after = match[3]?.trim();

  const variants = [];

  variants.push(after ? `${before} ${after}` : before!);
  variants.push(after ? `${inside} ${after}` : inside!);

  return variants;
};

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

export const updateNumOfMembers = async (
  guild_id: string,
  dir: 1 | -1 | 0 = 0,
) => {
  if (guild_id != ranni_guild.id) return;

  const channel = ranni_guild?.channels?.num_of_members;
  if (!channel) return;

  const [channel_name_without_number, number] = channel.name.split(":");

  if (!number) return;

  await channel.setName(
    `${channel_name_without_number}: ${parseInt(number) + dir}`,
  );
};

export const rewardBoosters = async () => {
  let last_month: number = moment().utc().month();

  setInterval(async () => {
    const now = moment().utc();
    const currentMonth = now.month();

    if (currentMonth === last_month) return;

    last_month = currentMonth;

    if (!ranni_guild.members) return;

    await ranni_guild.members.fetch();

    const SERVER_BOOSTER_ROLE_ID = "1311474973948379177";
    const GAMBLING_CHANNEL_ID = "1459659790417399960";

    const boosters =
      Array.from(ranni_guild.members.cache.values()).filter((member) =>
        member.roles.cache.has(SERVER_BOOSTER_ROLE_ID),
      ) ?? [];

    for (const booster of boosters) await addGems(booster.id, 50);

    await (client.channels.cache.get(GAMBLING_CHANNEL_ID) as TextChannel).send({
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
              value: `${ranni_guild.emojis?.gem.embed} 50`,
            },
          ])
          .setImage(
            "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExanIwcWRjbHZseHF2bm9oM3JpdnphdGl5dXJmMnp5Z3RleGw1ZTdlbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ji3BtQLFZrNRIUJa38/giphy.gif",
          ),
      ],
    });
  }, 1000 * 60);
};

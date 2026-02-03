import { Message, TextChannel } from "discord.js";
import { client } from "../index.js";
import { isInJail } from "../db/prisma.js";

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
        `U IN JAIL 😠!! U GET RELEASED <t:${Math.floor(jail_date.valueOf() / 1000 + 10 * 60)}:R>`,
      ),
    );
};

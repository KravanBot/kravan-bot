import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { diffInDays } from "../utils/helpers.js";
import moment from "moment";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    user: {
      total: {
        needs: { bank: true, coins: true },
        compute(user) {
          return user.coins + user.bank;
        },
      },
    },
  },
});

export const addCoins = async (id: string, amount: number) => {
  if (amount < 0) await addToJackpot(Math.abs(amount));

  const { coins } = await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: {
      coins: {
        increment: amount,
      },
    },
    create: {
      id,
      coins: amount,
    },
    where: {
      id,
    },
  });

  if (coins > 1_000_000) await addToBank(id, coins - 1_000_000);
  else if (coins < 0) await takeFromBank(id, Math.abs(coins));
};

export const takeCoins = async (id: string, amount: number) => {
  await addCoins(id, -amount);
};

export const getUserCoins = async (id: string) => {
  return (
    (await prisma.user.findUnique({
      select: {
        coins: true,
        bank: true,
      },
      where: {
        id,
      },
    })) ?? {
      bank: 0,
      coins: 0,
    }
  );
};

export const hasEnoughCoins = async (id: string, min: number) => {
  const data = await getUserCoins(id);

  return data.coins >= min;
};

export const addToBank = async (id: string, amount: number) => {
  const final_amount = Math.floor(amount * 0.9);
  let add_to_jackpot = amount - final_amount;

  if (final_amount == 0) return;

  const { bank } = await prisma.user.upsert({
    select: {
      bank: true,
    },
    update: {
      bank: {
        increment: final_amount,
      },
    },
    create: {
      id,
      bank: final_amount,
    },
    where: {
      id,
    },
  });

  if (bank < 0) {
    const diff = Math.abs(bank);

    await addToBank(id, diff);
    add_to_jackpot += diff;
  } else if (bank > 4_000_000_000) {
    const diff = bank - 4_000_000_000;

    await takeFromBank(id, diff);
    add_to_jackpot += diff;
  }

  if (add_to_jackpot <= 0) return;

  await addToJackpot(add_to_jackpot);
};

export const addToJackpot = async (amount: number) => {
  const amount_to_add = Math.floor(amount / 4);

  if (amount_to_add <= 0) return;

  // TODO: add amount_to_add to jackpot
};

export const takeFromBank = async (id: string, amount: number) => {
  await addToBank(id, -amount);
};

export const getTop5Richest = async () => {
  return (
    await prisma.user.findMany({
      take: 5,
      where: {
        coins: {
          gt: 0,
        },
      },
      orderBy: {
        bank: "desc",
        coins: "desc",
      },
    })
  ).sort((user) => -user.total);
};

export const updateAndReturnDaily = async (id: string) => {
  const user = await prisma.user.findUnique({
    select: {
      last_date: true,
    },
    where: {
      id,
    },
  });

  const date = moment().utc().toDate();

  const diff = user?.last_date
    ? Math.floor(diffInDays(date, user.last_date))
    : 1;

  if (diff <= 0) return -1;

  return (
    await prisma.user.upsert({
      select: {
        daily: true,
      },
      create: {
        id,
        daily: 1,
        last_date: date,
      },
      update: {
        daily:
          diff == 1
            ? {
                increment: 1,
              }
            : 1,
        last_date: date,
      },
      where: {
        id,
      },
    })
  ).daily;
};

export const updateTheft = async (id: string) => {
  const user = await prisma.user.findUnique({
    select: {
      last_theft: true,
    },
    where: {
      id,
    },
  });

  const date = moment().utc().toDate();

  if (
    user?.last_theft?.toLocaleDateString("en-US") ==
    date.toLocaleDateString("en-US")
  )
    return false;

  await prisma.user.upsert({
    create: {
      id,
      last_theft: date,
    },
    update: {
      last_theft: date,
    },
    where: {
      id,
    },
  });

  return true;
};

export const addItem = async (id: string, value: number, quantity: number) => {
  const existing = await prisma.user.findUnique({
    select: {
      items: true,
    },
    where: {
      id,
    },
  });

  const new_arr = Array.from({ length: quantity }).fill(value) as number[];
  const updated_arr = [...(existing?.items ?? []), ...new_arr];

  if (updated_arr.length > 100) return false;

  await prisma.user.upsert({
    create: {
      id,
      items: {
        set: updated_arr,
      },
    },
    update: {
      items: {
        set: updated_arr,
      },
    },
    where: {
      id,
    },
  });

  return true;
};

export const useItem = async (id: string, value: number) => {
  const existing = await prisma.user.findUnique({
    select: {
      items: true,
    },
    where: {
      id,
    },
  });

  if (!existing?.items.includes(value)) return false;

  existing.items.splice(existing.items.findIndex((el) => el == value)!, 1);

  await prisma.user.update({
    data: {
      items: {
        set: existing.items,
      },
    },
    where: {
      id,
    },
  });

  return true;
};

export const getInventory = async (id: string) => {
  return (
    (
      await prisma.user.findUnique({
        select: {
          items: true,
        },
        where: {
          id,
        },
      })
    )?.items ?? []
  );
};

export { prisma };

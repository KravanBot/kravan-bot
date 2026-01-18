import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { diffInDays } from "../utils/helpers.js";
import moment from "moment";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export const addCoins = async (id: string, amount: number) => {
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

  if (coins >= 0) return;

  await prisma.user.update({
    data: {
      coins: 0,
    },
    where: {
      id,
    },
  });
};

export const takeCoins = async (id: string, amount: number) => {
  await addCoins(id, -amount);
};

export const getUserCoins = async (id: string) => {
  return (
    (
      await prisma.user.findUnique({
        select: {
          coins: true,
        },
        where: {
          id,
        },
      })
    )?.coins ?? 0
  );
};

export const getTop5Richest = async () => {
  return await prisma.user.findMany({
    take: 5,
    where: {
      coins: {
        gt: 0,
      },
    },
    orderBy: {
      coins: "desc",
    },
  });
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

export const addItem = async (id: string, value: number) => {
  const existing = await prisma.user.findUnique({
    select: {
      items: true,
    },
    where: {
      id,
    },
  });

  await prisma.user.upsert({
    create: {
      id,
      items: {
        set: [value],
      },
    },
    update: {
      items: {
        set: [...(existing?.items ?? []), value],
      },
    },
    where: {
      id,
    },
  });
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

export { prisma };

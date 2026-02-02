import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { diffInMinutes } from "../utils/helpers.js";
import moment from "moment";
import { JsonObject } from "@prisma/client/runtime/client";
import { MiniMe } from "../actions/minime.js";
import { Store } from "../actions/store.js";

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

const getBankAmountWithTax = (amount: number, tax_rate: number = 5) => {
  const taxRate = amount > 0 ? 1 - tax_rate * 0.01 : 1;
  const finalAmount =
    amount > 0 ? Math.max(Math.floor(amount * taxRate), 1) : amount;

  return finalAmount;
};

export const addCoins = async (id: string, amount: number) => {
  if (amount < 0) return await takeCoins(id, amount);

  const current_data = await getUserCoins(id);

  if (amount == 0) return { ...current_data, diff: 0 };

  const new_data = { ...current_data };

  new_data.coins += amount;

  const coins_overflow = Math.max(0, new_data.coins - 500_000_000);

  if (coins_overflow) {
    new_data.coins -= coins_overflow;
    new_data.bank += getBankAmountWithTax(coins_overflow);

    const bank_overflow = Math.max(0, new_data.bank - 2_000_000_000);

    if (bank_overflow) {
      new_data.bank = bank_overflow + 500_000_000;
      new_data.gems += 15;
    } else new_data.bank -= bank_overflow;
  }

  await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: new_data,
    create: {
      id,
      ...new_data,
    },
    where: {
      id,
    },
  });

  return { ...new_data, diff: Math.abs(new_data.coins - current_data.coins) };
};

export const takeCoins = async (id: string, amount: number) => {
  amount = Math.abs(amount);

  await addToJackpot(Math.abs(amount));

  const current_data = await getUserCoins(id);
  const new_data = { ...current_data };

  new_data.coins -= amount;

  const coins_overflow = Math.max(0, 0 - new_data.coins);

  if (coins_overflow) {
    new_data.coins = 0;
    new_data.bank -= coins_overflow;
  }

  const bank_overflow = Math.max(0, 0 - new_data.bank);

  if (bank_overflow) {
    const gems = Math.ceil(bank_overflow / 100_000_000);

    new_data.bank = gems * 100_000_000 - bank_overflow;
    new_data.gems -= gems;
  }

  new_data.gems = Math.max(0, new_data.gems);

  await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: new_data,
    create: {
      id,
      ...new_data,
    },
    where: {
      id,
    },
  });

  return { ...new_data, diff: Math.abs(new_data.coins - current_data.coins) };
};

export const getUserCoins = async (id: string) => {
  return (
    (await prisma.user.findUnique({
      select: {
        coins: true,
        bank: true,
        gems: true,
      },
      where: {
        id,
      },
    })) ?? {
      bank: 0,
      coins: 0,
      gems: 0,
    }
  );
};

export const hasEnoughCoins = async (id: string, min: number) => {
  const data = await getUserCoins(id);

  return data.coins >= min;
};

export const addToBank = async (
  id: string,
  amount: number,
  tax_rate: number = 5,
) => {
  if (amount === 0) return 0;

  const current_data = await getUserCoins(id);
  const new_data = { ...current_data };

  new_data.bank += getBankAmountWithTax(amount, tax_rate);

  const bank_overflow = Math.max(0, new_data.bank - 2_000_000_000);

  if (bank_overflow) {
    new_data.coins += bank_overflow;
    const coins_overflow = Math.max(0, new_data.coins - 500_000_000);

    if (coins_overflow) {
      new_data.coins -= coins_overflow;
      new_data.bank = coins_overflow;
      new_data.gems += 20;
    } else new_data.bank -= bank_overflow;
  }

  await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: new_data,
    create: {
      id,
      ...new_data,
    },
    where: {
      id,
    },
  });

  return new_data.bank - current_data.bank;
};

export const takeFromBank = async (id: string, amount: number) => {
  if (amount === 0) return 0;

  const current_data = await getUserCoins(id);
  const new_data = { ...current_data };

  new_data.bank -= amount;

  if (new_data.bank < 0) {
    new_data.coins += amount;
    new_data.bank = 0;
  }

  if (new_data.coins < 0) new_data.coins = 0;

  await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: new_data,
    create: {
      id,
      ...new_data,
    },
    where: {
      id,
    },
  });

  return Math.abs(new_data.bank - current_data.bank);
};

export const addGems = async (id: string, amount: number) => {
  const current_data = await getUserCoins(id);
  const new_data = { ...current_data };

  new_data.gems += amount;

  await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: new_data,
    create: {
      id,
      ...new_data,
    },
    where: {
      id,
    },
  });
};

export const takeGems = async (id: string, amount: number) => {
  const current_data = await getUserCoins(id);
  const new_data = { ...current_data };

  new_data.gems -= Math.min(amount, current_data.gems);

  await prisma.user.upsert({
    select: {
      coins: true,
    },
    update: new_data,
    create: {
      id,
      ...new_data,
    },
    where: {
      id,
    },
  });
};

export const addToJackpot = async (amount: number) => {
  const amount_to_add = Math.max(Math.floor(amount / 1), 1);

  const jackpot = (
    await prisma.jackpot.updateManyAndReturn({
      data: {
        coins: {
          increment: amount_to_add,
        },
      },
    })
  )[0];

  if (jackpot && jackpot?.coins > 1_000_000_000)
    await prisma.jackpot.updateMany({
      data: {
        coins: {
          decrement: jackpot.coins - 1_000_000_000,
        },
      },
    });
};

export const getJackpot = async () => {
  const jackpot = await prisma.jackpot.findFirst();

  return jackpot?.coins;
};

export const clearJackpot = async () => {
  const jackpot = await getJackpot();

  await prisma.jackpot.updateMany({
    data: {
      coins: 0,
    },
  });

  return jackpot;
};

export const getTop5Richest = async () => {
  return (
    await prisma.user.findMany({
      select: {
        id: true,
        coins: true,
        bank: true,
        gems: true,
        total: true,
      },
      where: {
        NOT: {
          AND: {
            coins: {
              lte: 0,
            },
            bank: {
              lte: 0,
            },
            gems: {
              lte: 0,
            },
          },
        },
      },
    })
  )
    .sort(
      (a, b) =>
        b.gems * 100_000_000 + b.total - (a.gems * 100_000_000 + a.total),
    )
    .slice(0, 6);
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

  const last_date = moment(user?.last_date).startOf("day");
  const current_date = moment().utc().startOf("day");

  const diff = user?.last_date
    ? Math.floor(Math.abs(last_date.diff(current_date, "days")))
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
        last_date: current_date.toDate(),
      },
      update: {
        daily:
          diff == 1
            ? {
                increment: 1,
              }
            : 1,
        last_date: current_date.toDate(),
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

  const last_date = moment(user?.last_theft).startOf("day");
  const current_date = moment().utc().startOf("day");

  const diff = user?.last_theft
    ? Math.floor(Math.abs(last_date.diff(current_date, "days")))
    : 1;

  if (diff <= 0) return false;

  await prisma.user.upsert({
    create: {
      id,
      last_theft: current_date.toDate(),
    },
    update: {
      last_theft: current_date.toDate(),
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

export const hasItem = async (id: string, value: number) => {
  const existing = await prisma.user.findUnique({
    select: {
      items: true,
    },
    where: {
      id,
    },
  });

  if (!existing?.items.includes(value))
    return { success: false, items: existing?.items ?? [] };

  return { success: true, items: existing.items };
};

export const useItem = async (id: string, value: number) => {
  const { success, items } = await hasItem(id, value);

  if (!success) return false;

  items.splice(items.findIndex((el) => el == value)!, 1);

  const { type } = Store.getItemType(value);
  let minime: JsonObject | null = null;

  if (!items.includes(value)) {
    minime = await getMinime(id);

    if (minime?.[type] == value) delete minime[type];
  }

  await prisma.user.update({
    data: {
      items: {
        set: items,
      },
      minime:
        minime != null
          ? {
              set: minime,
            }
          : {},
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

export const isInJail = async (id: string) => {
  const user = await prisma.user.findUnique({
    select: {
      jail: true,
    },
    where: {
      id,
    },
  });

  if (user?.jail && diffInMinutes(user.jail, moment().utc().toDate()) >= 10) {
    await prisma.user.update({
      data: {
        jail: null,
      },
      where: {
        id,
      },
    });

    return null;
  }

  return user?.jail ?? null;
};

export const putInJail = async (id: string) => {
  const date = moment().utc().toDate();

  await prisma.user.upsert({
    create: {
      id,
      jail: date,
    },
    update: {
      jail: date,
    },
    where: {
      id,
    },
  });
};

export const getMinime = async (id: string) => {
  return (
    await prisma.user.findUnique({
      select: {
        minime: true,
      },
      where: {
        id,
      },
    })
  )?.minime as JsonObject | null;
};

export const fetchAndPutOnMinime = async (id: string, data: Object) => {
  const prev = (await getMinime(id)) ?? {};

  await putOnMinime(id, data, prev);
};

export const putOnMinime = async (
  id: string,
  data: Object,
  prev: JsonObject,
) => {
  await prisma.user.update({
    data: {
      minime: {
        ...prev,
        ...data,
      },
    },
    where: {
      id,
    },
  });
};

export const takeFromMinime = async (
  id: string,
  prev: JsonObject,
  piece: string,
) => {
  const new_minime = { ...prev };
  delete new_minime[piece];

  await prisma.user.update({
    data: {
      minime: new_minime,
    },
    where: {
      id,
    },
  });
};

export { prisma };

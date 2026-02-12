import {
  CacheType,
  ChatInputCommandInteraction,
  Message,
  OmitPartialGroupDMChannel,
  PartialMessage,
  TextChannel,
  userMention,
} from "discord.js";
import {
  convertToNumber,
  getRandomFromArray,
  goThroughAllMessages,
  validateNotInJail,
} from "../utils/helpers.js";
import { addCoins, hasEnoughCoins, takeCoins } from "../db/prisma.js";
import { Mutex } from "async-mutex";
import { client } from "../index.js";

enum COUNT_EVENT {
  NORMAL = "Normal",
  REVERSE = "Reverse",
  BOOM = "7 Boom",
}

type MessageT = Message<boolean>;

export class Counting {
  static COUNTING_CHANNEL_ID = "1236751657086484587";

  #last_number: number | null;
  #event: COUNT_EVENT | null;
  #last_counter_id: string | null;
  #last_msg: MessageT | null;
  #trapped_by: string | null;
  #mutex: Mutex;

  constructor() {
    this.#last_number = null;
    this.#event = null;
    this.#last_counter_id = null;
    this.#last_msg = null;
    this.#trapped_by = null;
    this.#mutex = new Mutex();

    (async () => {
      await this.#getLastNumber();
    })();
  }

  async onMessageDelete(
    message: OmitPartialGroupDMChannel<
      Message<boolean> | PartialMessage<boolean>
    >,
  ) {
    if (message.id != this.#last_msg?.id) return;

    if (this.#trapped_by) {
      await addCoins(this.#trapped_by, this.#getTrapCost());
    }

    await this.#getLastNumber();
  }

  async #right(message: MessageT, dir: 1 | -1) {
    await addCoins(this.#last_counter_id!, 1);
    await message.react("✅");

    if (this.#trapped_by) {
      await message.reply(
        `NICE ${userMention(
          message.author.id,
        )}! You overcame the trap and got ${this.#getTrapCost() * 2} coins 🪙`,
      );
      await addCoins(message.author.id, this.#getTrapCost() * 2);
    }

    this.#last_number! += dir;
    this.#trapped_by = null;
    this.#last_msg = message;

    if (dir > 0 && this.#last_number == 7) {
      // last number was 6, send 6 7 gif
      await message.reply(
        "https://tenor.com/view/bosnov-67-bosnov-67-67-meme-gif-16727368109953357722",
      );
      await message.react("6️⃣");
      await message.react("7️⃣");
    }
  }

  async #wrong(message: MessageT, sentence: string) {
    await message.react("❌");
    await message.reply(
      `${sentence}\n\nCount was reseted to 0 thanks to ${userMention(
        this.#last_counter_id!,
      )}. Event was changed back to ${COUNT_EVENT.NORMAL}`,
    );

    if (this.#trapped_by) {
      await addCoins(this.#trapped_by, this.#getTrapCost() * 2);
    }

    this.#last_number = 0;
    this.#last_counter_id = null;
    this.#event = COUNT_EVENT.NORMAL;
    this.#trapped_by = null;
    this.#last_msg = null;
  }

  async #changeEvent(message: MessageT) {
    if ((this.#last_number ?? 0) <= 0) this.#event = COUNT_EVENT.NORMAL;
    else if (Math.floor(Math.random() * 10) != 0) return;
    else
      this.#event = getRandomFromArray(
        [COUNT_EVENT.NORMAL, COUNT_EVENT.BOOM, COUNT_EVENT.REVERSE].filter(
          (event) => event != this.#event,
        ),
      );

    await (message.channel as TextChannel).send(
      `Event changed to ${this.#event}`,
    );
  }

  async #checkOrder(
    message: MessageT,
    value: number,
    dir: 1 | -1,
  ): Promise<boolean> {
    let next_val = this.#last_number! + dir;

    if (this.#trapped_by) next_val += Math.floor(Math.random() * 2) * -dir;

    if (value == next_val) {
      this.#last_number = next_val - dir;

      if (this.#event != COUNT_EVENT.BOOM) await this.#right(message, dir);

      return true;
    }

    await this.#wrong(
      message,
      this.#trapped_by
        ? `DAMN U FELL FOR THE TRAP U SUCK\n${userMention(
            this.#trapped_by,
          )} got +${this.#getTrapCost() * 2} coins 🪙`
        : `BRO LIKE WHO DOESNT KNOW ITS ${next_val} U SUCK`,
    );

    return false;
  }

  async handleMessage(message: MessageT) {
    await this.#lock(async () => {
      if (message.author.id == client.user?.id) return;

      const value = convertToNumber(message.content);

      if (
        (this.#event != COUNT_EVENT.BOOM && isNaN(value)) ||
        (this.#event == COUNT_EVENT.BOOM &&
          isNaN(value) &&
          message.content.toLowerCase() != "boom")
      )
        return;

      await validateNotInJail(message.author.id);

      if (this.#last_counter_id == message.author.id && !this.#trapped_by)
        return await message.reply("WHY R U COUNTING TWICE STUPID");

      if (this.#trapped_by == message.author.id)
        return await message.reply("U TRAPPED U CANT GUESS IT");

      this.#last_counter_id = message.author.id;

      const checkOrder = async (dir: 1 | -1) => {
        return await this.#checkOrder(message, value, dir);
      };

      switch (this.#event) {
        case COUNT_EVENT.NORMAL:
          await checkOrder(1);

          break;

        case COUNT_EVENT.REVERSE:
          await checkOrder(-1);

          break;

        case COUNT_EVENT.BOOM:
          if (!isNaN(value) && !(await checkOrder(1))) return;

          const next_number = this.#last_number! + 1;
          const should_say_boom =
            next_number != 0 &&
            (next_number % 7 == 0 || next_number.toString().includes("7"));

          if (!isNaN(value) && should_say_boom)
            return await this.#wrong(message, "SHOULD HAVE SAID BOOM DUMMY");

          if (isNaN(value) && !should_say_boom)
            return await this.#wrong(message, "Y U SAYING BOOM DUMMY");

          await this.#right(message, 1);

          if (isNaN(value)) {
            const reply = await message.reply(`${next_number}`);
            await reply.react("✅");

            this.#last_msg = reply;
          }

          break;
      }

      if (
        this.#last_number! > 0 &&
        this.#last_number! < 50 &&
        this.#event != COUNT_EVENT.REVERSE
      )
        return;

      this.#changeEvent(message);
    }, false);
  }

  async sendCountingDetails(
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    await this.#lock(async () => {
      if (!this.#last_counter_id)
        return await interaction.reply(
          `Count is currently 0. Start it dummy like everyone knows its 1 cmon free coins`,
        );

      const current_event_msg = ` ${
        this.#event != COUNT_EVENT.NORMAL
          ? `Current event is ${this.#event}!`
          : ""
      }`;

      const trapped_msg = this.#trapped_by
        ? `, but BE CAREFUL, it was TRAPPED by ${userMention(
            this.#trapped_by,
          )}\nTry and overcome it, u might win some money... or else..`
        : "";

      await interaction.reply(
        `Last counted number was ${this.#last_number} by ${userMention(
          this.#last_counter_id,
        )}${trapped_msg}.\n\n${current_event_msg}`,
      );
    });
  }

  async #getLastNumber() {
    await this.#lock(async () => {
      this.#last_number = null;
      this.#event = null;
      this.#last_counter_id = null;
      this.#last_msg = null;
      this.#trapped_by = null;

      await goThroughAllMessages(
        Counting.COUNTING_CHANNEL_ID,
        async (messages) => {
          for (const message of messages) {
            const sent_by_bot = message.author.id == client.user?.id;
            const is_number = !isNaN(convertToNumber(message.content));

            if (sent_by_bot) {
              // sent by bot

              if (!this.#event)
                this.#event = message.content.includes(COUNT_EVENT.BOOM)
                  ? COUNT_EVENT.BOOM
                  : message.content.includes(COUNT_EVENT.REVERSE)
                    ? COUNT_EVENT.REVERSE
                    : message.content.includes(COUNT_EVENT.NORMAL)
                      ? COUNT_EVENT.NORMAL
                      : null;

              if (!this.#last_counter_id && message.content.includes("🪤"))
                this.#trapped_by = message.content
                  .split(">")[0]!
                  .split("<@")[1]!;

              if (this.#event || this.#trapped_by || !is_number) continue;
            }

            // sent by user

            if (this.#event && this.#last_counter_id != null) return false;

            if (this.#last_counter_id != null) continue;

            const emoji = message?.reactions.cache.find((val) => val.me);

            if (!emoji) continue;

            if (!sent_by_bot) this.#last_counter_id = message.author.id;

            if (!this.#last_msg) this.#last_msg = message;

            if (this.#last_number != null) continue;

            const is_wrong = emoji.emoji.name == "❌";
            const is_trapped = emoji.emoji.name == "🪤";

            if (is_wrong) {
              this.#last_number = 0;
              this.#event = COUNT_EVENT.NORMAL;
              this.#last_counter_id = null;

              return false;
            } else this.#last_number = convertToNumber(message.content ?? "0");

            if (!is_trapped) this.#trapped_by = null;

            if (this.#event && this.#last_counter_id != null) return false;
          }

          return true;
        },
      );

      if (!this.#last_number) this.#last_number = 0;
      if (!this.#event) this.#event = COUNT_EVENT.NORMAL;
    });
  }

  async trap(interaction: ChatInputCommandInteraction<CacheType>) {
    await this.#lock(async () => {
      const cost = this.#getTrapCost();

      if (!this.#last_counter_id)
        return await interaction.reply("COUNTING SEQUENCE MUST BEGIN FIRST");

      if (this.#trapped_by)
        return await interaction.reply("NUMBER IS ALREADY TRAPPED");

      if (Math.abs(this.#last_number!) < 50)
        return await interaction.reply("U CAN TRAP ONLY AFTER COUNTING TO 50");

      if (!(await hasEnoughCoins(interaction.user.id, cost)))
        return await interaction.reply(
          "BROKIE U CANT AFFORD TRAPPING THIS NUMBER",
        );

      try {
        await this.#last_msg!.reactions.removeAll();
        await this.#last_msg!.react("🪤");

        await takeCoins(interaction.user.id, cost);

        await interaction.reply(
          `${userMention(interaction.user.id)} trapped the next number 🪤`,
        );

        await this.#last_msg!.reply("Be careful...");

        this.#trapped_by = interaction.user.id;
      } catch (e) {
        console.log(e);
        await interaction.reply(
          "Something went wrong. Maybe someone deleted his message...",
        );
      }
    });
  }

  async #lock(action: () => Promise<any>, wait_if_locked: boolean = true) {
    if (this.#mutex.isLocked() && !wait_if_locked) return;

    const release = await this.#mutex.acquire();

    try {
      await action();
    } finally {
      release();
    }
  }

  #getTrapCost() {
    return Math.floor(Math.abs(this.#last_number!) / 5);
  }
}

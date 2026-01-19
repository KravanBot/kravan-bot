import {
  CacheType,
  ChatInputCommandInteraction,
  Message,
  TextChannel,
  User,
  userMention,
} from "discord.js";
import { client } from "../index.js";
import { addCoins, getUserCoins, takeCoins, useItem } from "../db/prisma.js";
import { getRandomFromArray } from "../utils/helpers.js";
import { CustomEmbed } from "../utils/embed.js";
import { ItemId } from "./store.js";

export class Steal {
  static CHANNEL_ID = "1461421056299499672";

  #theif: User;
  #victim: User;
  #interaction: ChatInputCommandInteraction<CacheType>;
  #msg: Message<boolean> | null;

  constructor(
    theif: User,
    victim: User,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    this.#theif = theif;
    this.#victim = victim;
    this.#interaction = interaction;
    this.#msg = null;

    (async () => {
      await this.#sendMsg();
      await this.#waitForResponse();
    })();
  }

  async #sendMsg() {
    await this.#interaction.reply("Loading...");

    const end_time = Math.floor(new Date().valueOf() / 1000 + 10 * 60);

    if (await useItem(this.#victim.id, ItemId.ALARM)) {
      this.#msg = await this.#getChannel().send(
        `BROOOO ${userMention(
          this.#victim.id,
        )} WAKE UPPPPP SOMEONE IS TRYING TO STEAL FROM UUUUUUU\nREPLY TO THIS MESSAGE <t:${end_time}:R> TO CATCH THE MF\n\n${userMention(
          this.#victim.id,
        )} ${userMention(this.#victim.id)} ${userMention(this.#victim.id)}`,
      );
      await this.#getChannel().send(
        "https://tenor.com/view/haintz-gif-24744086",
      );
    } else
      this.#msg = await this.#getChannel().send(
        `Someone is sneaking into ${this.#victim.displayName}'s place. if u r ${
          this.#victim.displayName
        }, reply to this message <t:${end_time}:R> to catch the filthy theif...`,
      );

    await this.#interaction.deleteReply();
  }

  async #waitForResponse() {
    try {
      // TODO: change time if victim bought more time to reply
      const response = await this.#getChannel().awaitMessages({
        max: 1,
        filter: (msg) =>
          msg.author.id == this.#victim.id &&
          msg.reference?.messageId == this.#msg?.id,
        time: 1000 * 60 * 10,
        errors: ["time"],
      });

      await response.first()?.delete();

      await this.#msg?.edit({
        content: "",
        embeds: [
          new CustomEmbed()
            .setColor(0xf29411)
            .setDescription(
              `NICE ${userMention(this.#victim.id)}!! YOU CAUGHT ${userMention(
                this.#theif.id,
              )} THINKING HE IS SLICK WITH IT PFFFFF\n\n${
                this.#theif.displayName
              } gets fined with 10 coins for attempting to steal, its not nice... 😠`,
            )
            .setThumbnail(this.#theif.avatarURL())
            .setImage(
              "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYW1jNXFqYmE4NTFiNW4xeG9hMjllMmdhYTU2eGJkdDJ2c2J4MDJ5NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/oohqHb5EbWKHypBtdh/giphy.gif",
            ),
        ],
      });

      await takeCoins(this.#theif.id, 10);
    } catch {
      if (Math.floor(Math.random() * 2) <= 0) {
        await this.#msg?.edit({
          content: "",
          embeds: [
            new CustomEmbed()
              .setColor(0xf29411)
              .setDescription(
                `CCTV CAMS CAUGHT ${userMention(
                  this.#theif.id,
                )} ON 4K RUNNING WITH ${userMention(
                  this.#victim.id,
                )}'S MONEY!!\n\n${
                  this.#theif.displayName
                } gets fined with 10 coins for attempting to steal, its not nice... 😠`,
              )
              .setThumbnail(this.#theif.avatarURL())
              .setImage(
                "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaThvNWkxaGtnd2pobDljeHRnYTFjaXZtbjlzeHp3MG0yYXo2aXJwbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dLhoOYRmsJVOhKbyTK/giphy.gif",
              ),
          ],
        });

        await takeCoins(this.#theif.id, 10);

        return;
      }

      const full_victim_amount = (await getUserCoins(this.#victim.id)).coins;
      const amount = Math.max(
        Math.floor(
          Math.random() * (full_victim_amount / 16 + 1) +
            full_victim_amount / 16,
        ),
        1,
      );

      await takeCoins(this.#victim.id, amount);
      await addCoins(this.#theif.id, amount);

      await this.#msg?.edit({
        content: "",
        embeds: [
          new CustomEmbed()
            .setColor(0xf29411)
            .setDescription(
              `someone just stole ${amount.toLocaleString()} coins from ${userMention(
                this.#victim.id,
              )}... 😬\n\nYou might want to consider buying an alarm 🚨 in the shop 🛍️`,
            )
            .setThumbnail(this.#victim.avatarURL())
            .setImage(
              "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTFjdG1rZ2xqMmdjZDUxa3c4dTkzMjc4MzE4cTQ3b3JvMndwZzBzdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l8vN5etR8DIoHA0qzV/giphy.gif",
            ),
        ],
      });
    }
  }

  #getChannel() {
    return client.channels.cache.get(Steal.CHANNEL_ID) as TextChannel;
  }
}

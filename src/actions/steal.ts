import {
  CacheType,
  ChatInputCommandInteraction,
  Message,
  TextChannel,
  User,
  userMention,
} from "discord.js";
import { client } from "../index.js";
import { addCoins, getUserCoins, takeCoins } from "../db/prisma.js";

export class Steal {
  static CHANNEL_ID = "1310738903061237820";

  #theif: User;
  #victim: User;
  #interaction: ChatInputCommandInteraction<CacheType>;
  #msg: Message<boolean> | null;

  constructor(
    theif: User,
    victim: User,
    interaction: ChatInputCommandInteraction<CacheType>
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
    // TODO: send a new message with the victim's mention if he has an alarm

    await this.#interaction.reply("Loading...");

    this.#msg = await this.#getChannel().send(
      `Someone is sneaking into ${this.#victim.displayName}'s place. if u r ${
        this.#victim.displayName
      }, reply to this message to catch the filthy theif...`
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

      await this.#msg?.edit(
        `NICE ${userMention(this.#victim.id)}!! YOU CAUGHT ${userMention(
          this.#theif.id
        )} THINKING HE IS SLICK WITH IT PFFFFF\n\n${
          this.#theif.displayName
        } gets fined with 10 coins for attempting to steal, its not nice... 😠\n\nhttps://images-ext-1.discordapp.net/external/vkwVn-co6EfwnR4CXyge4K0X3dgRlWB99NdzjGRiktA/https/media.tenor.com/E4nvGmkDP7MAAAPo/cbb2-cbbus2.mp4`
      );

      await takeCoins(this.#theif.id, 10);
    } catch {
      if (Math.floor(Math.random() * 2) <= 0) {
        await this.#msg?.edit(
          `CCTV CAMS CAUGHT ${userMention(
            this.#theif.id
          )} ON 4K RUNNING WITH ${userMention(this.#victim.id)}'S MONEY!!\n\n${
            this.#theif.displayName
          } gets fined with 10 coins for attempting to steal, its not nice... 😠\n\nhttps://images-ext-1.discordapp.net/external/ZyzoTDgEjDVt0N-rmiydGRvVNqKjf6BOQ-IUPln5A08/https/media.tenor.com/QgVeRoMC43MAAAPo/caught-you-in4k.mp4`
        );

        await takeCoins(this.#theif.id, 10);

        return;
      }

      const full_victim_amount = await getUserCoins(this.#victim.id);
      const amount = Math.max(
        Math.floor(Math.random() * (full_victim_amount / 8 + 1)) +
          full_victim_amount / 8,
        1
      );

      await takeCoins(this.#victim.id, amount);
      await addCoins(this.#theif.id, amount);

      await this.#msg?.edit(
        `someone just stole ${amount} coins from ${userMention(
          this.#victim.id
        )}... 😬\n\nYou might want to consider buying an alarm 🚨 in the shop 🛍️\n\nhttps://images-ext-1.discordapp.net/external/pAbu76lFuQEgaVIC5xUpO7278v7yYJiFOwVL5hSOWE0/https/media.tenor.com/jL1f0JCmZEkAAAPo/ill-be-taking-that-spongebob.mp4`
      );
    }
  }

  #getChannel() {
    return client.channels.cache.get(Steal.CHANNEL_ID) as TextChannel;
  }
}

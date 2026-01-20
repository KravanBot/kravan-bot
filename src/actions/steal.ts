import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Message,
  TextChannel,
  User,
  userMention,
} from "discord.js";
import { client } from "../index.js";
import {
  addCoins,
  getUserCoins,
  hasEnoughCoins,
  putInJail,
  takeCoins,
  useItem,
} from "../db/prisma.js";
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

  async #sendCaught(msg: string, image: string) {
    const value = await this.#getValue();

    const sendUserChosenResponse = async (custom_id: string) => {
      const can_afford = await hasEnoughCoins(this.#theif.id, value);

      if (custom_id == "pay" && can_afford)
        await takeCoins(this.#theif.id, value);
      else await putInJail(this.#theif.id);

      await this.#msg?.edit({
        content: `${userMention(this.#theif.id)} tried to steal from ${userMention(this.#victim.id)}, and ${custom_id == "pay" && !can_afford ? "was forced to serve in jail for 10 minutes ⛓️" : `chose to ${custom_id == "jail" ? "serve in jail for 10 minutes ⛓️" : `pay a ${value.toLocaleString()} coins fine 🪙`}`}`,
        embeds: [],
        components: [],
      });
    };

    await this.#msg?.delete();

    this.#msg = await this.#getChannel().send({
      content: "",
      embeds: [
        new CustomEmbed()
          .setColor(0xf29411)
          .setDescription(
            `${msg}\n\n${
              this.#theif.displayName
            }, if thats u (shame on u), choose the option u want to take (you have 5 minutes, unanswering will put you in jail)`,
          )
          .setThumbnail(this.#theif.avatarURL())
          .setImage(image),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("pay")
            .setLabel(`🪙 ${value.toLocaleString()}`)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("jail")
            .setLabel(`⛓️ 10 mins`)
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    });

    try {
      const confirmation = await this.#msg!.awaitMessageComponent({
        filter: (i) => i.user.id === this.#theif.id,
        time: 300_000,
      });

      await sendUserChosenResponse(confirmation?.customId);
    } catch {
      await sendUserChosenResponse("jail");
    }
  }

  async #waitForResponse() {
    try {
      const response = await this.#getChannel().awaitMessages({
        max: 1,
        filter: (msg) =>
          msg.author.id == this.#victim.id &&
          msg.reference?.messageId == this.#msg?.id,
        time: 1000 * 60 * 10,
        errors: ["time"],
      });

      await response.first()?.delete();

      await this.#sendCaught(
        `NICE ${userMention(this.#victim.id)}!! YOU CAUGHT ${userMention(
          this.#theif.id,
        )} THINKING HE IS SLICK WITH IT PFFFFF`,
        "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYW1jNXFqYmE4NTFiNW4xeG9hMjllMmdhYTU2eGJkdDJ2c2J4MDJ5NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/oohqHb5EbWKHypBtdh/giphy.gif",
      );
    } catch {
      if (Math.floor(Math.random() * 2) <= 0)
        return await this.#sendCaught(
          `CCTV CAMS CAUGHT ${userMention(
            this.#theif.id,
          )} ON 4K RUNNING WITH ${userMention(this.#victim.id)}'S MONEY!!`,
          "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaThvNWkxaGtnd2pobDljeHRnYTFjaXZtbjlzeHp3MG0yYXo2aXJwbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dLhoOYRmsJVOhKbyTK/giphy.gif",
        );

      const amount = await this.#getValue();

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

  async #getValue() {
    const full_victim_amount = (await getUserCoins(this.#victim.id)).coins;

    const amount = Math.max(
      Math.floor(
        Math.random() * (full_victim_amount / 20 + 1) + full_victim_amount / 20,
      ),
      1,
    );

    return amount;
  }

  #getChannel() {
    return client.channels.cache.get(Steal.CHANNEL_ID) as TextChannel;
  }
}

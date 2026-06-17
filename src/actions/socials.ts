import { Message, MessageCreateOptions } from "discord.js";
import { ranni_guild } from "../index.js";
import { CustomEmbed } from "../utils/embed.js";
import moment from "moment";

export class Socials {
  static #YT_MOD_CHANNEL_ID = "1505579123043602433";
  static #TIKTOK_MOD_CHANNEL_ID = "1505579181625577634";

  static async #handleYT(message: Message<boolean>) {
    const last_yt_embed = message.embeds[0];

    if (!last_yt_embed || !ranni_guild.channels?.yt) return;

    const [title, tags] = last_yt_embed.title!.split(/#(.*)/s);

    const is_short = tags?.length;

    const fields = [
      {
        name: "💬 Title",
        value: title!,
      },
    ];

    if (is_short)
      fields.push({
        name: "#️⃣ Tags",
        value: tags!.replaceAll(" #", ", "),
      });

    const payload: MessageCreateOptions = {
      embeds: [
        new CustomEmbed()
          .setTitle(
            `<:youtube:1505559546905493675> NEW ${is_short ? "SHORT" : "YOUTUBE VIDEO"} <:youtube:1505559546905493675>`,
          )
          .setURL(last_yt_embed.url)
          .setFields(fields)
          .setColor(0xff0000)
          .setImage(last_yt_embed.image!.url)
          .setThumbnail(
            "https://yt3.googleusercontent.com/_GUnYS_dKGOhJFlW4Jd84ARG7vAOPFCtFa_qkqbYMZAO-lxMn5udwi9W7tOXomjCwjOPwwSh=s160-c-k-c0x00ffffff-no-rj",
          )
          .setTimestamp(new Date(last_yt_embed.timestamp!)),
      ],
    };

    if (!is_short) {
      // for now, dont announce anything thats not a short

      payload.content = "<@&1505592084059390044>";
      return;
    }

    await ranni_guild.channels.yt.send(payload);
  }

  static async #handleTiktok(message: Message<boolean>) {
    const last_tiktok_embed = message.embeds[0];

    if (
      !last_tiktok_embed ||
      !ranni_guild.channels?.tiktok ||
      !ranni_guild.channels?.yt
    )
      return;

    const [title, tags] = last_tiktok_embed.title!.split(/#(.*)/s);
    const date = new Date(last_tiktok_embed.timestamp!);

    await ranni_guild.channels.tiktok.send({
      content: `<@&1505591983681573056>`,
      embeds: [
        new CustomEmbed()
          .setTitle(
            `<:TikTok:1391249483131654247> NEW TIKTOK <:TikTok:1391249483131654247>`,
          )
          .setURL(last_tiktok_embed.url)
          .setFields([
            {
              name: "💬 Title",
              value: title!,
            },
            {
              name: "#️⃣ Tags",
              value: tags!.replaceAll(" #", ", "),
            },
          ])
          .setColor(0xff0050)
          .setImage(
            (await ranni_guild.channels.yt.messages.fetch({ limit: 3 }))
              .filter((el) =>
                moment(el.embeds[0]?.timestamp).isSame(moment(date), "day"),
              )
              .at(0)?.embeds[0]?.image?.url ?? last_tiktok_embed.image!.url,
          )
          .setThumbnail(
            "https://yt3.googleusercontent.com/_GUnYS_dKGOhJFlW4Jd84ARG7vAOPFCtFa_qkqbYMZAO-lxMn5udwi9W7tOXomjCwjOPwwSh=s160-c-k-c0x00ffffff-no-rj",
          )
          .setTimestamp(date),
      ],
    });
  }

  static handleUpload = async (message: Message<boolean>) => {
    switch (message.channelId) {
      case Socials.#YT_MOD_CHANNEL_ID: {
        this.#handleYT(message);

        break;
      }

      case Socials.#TIKTOK_MOD_CHANNEL_ID: {
        this.#handleTiktok(message);

        break;
      }
    }
  };
}

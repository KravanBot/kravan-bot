import moment from "moment";
import { Moment } from "moment";
import { client, ranni_guild } from "../index.js";
import { ActivityType, AttachmentBuilder, Message } from "discord.js";
import { CustomEmbed } from "../utils/embed.js";
import fs from "fs/promises";

type TwitchToken = {
  accessToken: string;
  expiresAt: number;
};

export class Twitch {
  static #BROADCASTER_ID = "1207016011";
  static #token: TwitchToken | null = null;
  static #STREAM_DAYS = [2, 5, 6];
  static pending_clips: Map<string, string> = new Map();

  static #last_clip_date = moment().utc();
  static #last_announcement: Message<boolean> | null = null;

  constructor() {
    (async () => {
      if (Twitch.#token || !ranni_guild.channels) return;

      Twitch.#token = await Twitch.#getAppToken();
      Twitch.#last_announcement =
        (await ranni_guild.channels.twitch.messages.fetch({ limit: 1 })).at(
          0,
        ) ?? null;

      setInterval(async () => {
        await Twitch.handleNewMinute();
      }, 1000 * 60);
    })();
  }

  static #getAppToken = async () => {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        grant_type: "client_credentials",
      }),
    });

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  };

  static #refreshToken = async () => {
    const REFRESH_BUFFER = 2 * 60 * 1000;

    if (
      !Twitch.#token ||
      Date.now() >= Twitch.#token.expiresAt - REFRESH_BUFFER
    )
      Twitch.#token = await Twitch.#getAppToken();
  };

  static #getClips = async (last_clip_date: Moment) => {
    await Twitch.#refreshToken();

    const format = (date: Moment) => date.format("YYYY-MM-DD[T]HH:mm:ss[Z]");

    const res = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${Twitch.#BROADCASTER_ID}&first=100&started_at=${format(last_clip_date)}&ended_at=${format(moment().utc())}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${Twitch.#token!.accessToken!}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID!,
        },
      },
    );
    const body = (await res.json()) as {
      data: {
        url: string;
        creator_name: string;
        thumbnail_url: string;
        duration: number;
        created_at: string;
        title: string;
      }[];
    };

    return body.data
      .filter(({ created_at }) => moment(created_at).isAfter(last_clip_date))
      .toSorted((a, b) => {
        const timeA = moment(a.created_at);
        const timeB = moment(b.created_at);

        return timeA.valueOf() - timeB.valueOf();
      });
  };

  static #getLive = async () => {
    await Twitch.#refreshToken();

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${Twitch.#BROADCASTER_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${Twitch.#token!.accessToken!}`,
          "Client-ID": process.env.TWITCH_CLIENT_ID!,
        },
      },
    );

    const body = (await res.json()) as {
      data: {
        title: string;
        thumbnail_url: string;
        started_at: string;
        viewer_count: number;
        game_name: string;
      }[];
    };

    return (
      body.data?.map((live) => ({
        ...live,
        thumbnail_url: live.thumbnail_url
          .replace("{width}", "1920")
          .replace("{height}", "1080"),
      })) ?? []
    );
  };

  static handleNewMinute = async () => {
    let is_live = false;

    const handleLive = async () => {
      const live = (await Twitch.#getLive())[0];

      is_live = !!live;

      client.user?.setPresence({
        activities: is_live
          ? [
              {
                name: `🔴 ${live?.title ?? ""} 🔴`,
                type: ActivityType.Streaming,
                url: "https://www.twitch.tv/ranniria",
              },
            ]
          : [],
      });

      if (
        !live ||
        live.thumbnail_url.startsWith(
          "https://static-cdn.jtvnw.net/ttv-static/404_preview",
        )
      ) {
        const embed = this.#last_announcement?.embeds.at(0);

        if (!embed || embed.image?.url.includes("time-table.png")) return;

        const timestamp = moment(embed.timestamp);
        const next_stream =
          Twitch.#STREAM_DAYS[
            (Twitch.#STREAM_DAYS.indexOf(timestamp.day()) + 1) %
              Twitch.#STREAM_DAYS.length
          ]!;

        const next_stream_timestamp = moment(embed.timestamp)
          .utc()
          .day(next_stream + (next_stream > timestamp.day() ? 0 : 7))
          .hour(17)
          .minute(0)
          .second(0);

        this.#last_announcement = await this.#last_announcement!.edit({
          embeds: [
            new CustomEmbed()
              .setTitle(
                `<:purplefireemoji:1478027723732553780> JOIN US ON ${next_stream_timestamp.format("dddd").toUpperCase()} 6PM CET <:purplefireemoji:1478027723732553780>`,
              )
              .setFields([
                ...embed.fields.slice(0, 2),
                {
                  name: "🕑 Next Stream",
                  value: `<t:${Math.floor(next_stream_timestamp.valueOf() / 1000)}:R>`,
                  inline: true,
                },
              ])
              .setColor(embed.color)
              .setThumbnail(embed.thumbnail!.url)
              .setImage("attachment://time-table.png")
              .setTimestamp(timestamp.toDate()),
          ],
          files: [
            new AttachmentBuilder(
              await fs.readFile("./assets/time-table.png"),
              {
                name: "time-table.png",
              },
            ),
          ],
        });

        return;
      }

      const last_timestamp =
        Twitch.#last_announcement?.embeds.at(0)?.timestamp ?? null;

      const has_been_announced = last_timestamp
        ? moment(last_timestamp).isSame(live.started_at)
        : false;

      const props = {
        content: `<@&1311169420457934848>`,
        embeds: [
          new CustomEmbed()
            .setTitle(
              "<:purplefireemoji:1478027723732553780> LIVE NOW <:purplefireemoji:1478027723732553780>",
            )
            .setFields([
              {
                name: "💬 Title",
                value: live.title,
              },
              {
                name: "🕹️ Games",
                value: `<:valorant:1478018219192356874> Valorant\n\u200b\n\u200b${new Array(
                  5,
                )
                  .fill(
                    "<a:Raven_Jam:1387726635268182127><a:RavenTwerk:1388053524893401201>",
                  )
                  .join("")}`,
                inline: true,
              },
              {
                name: "<:cute_blush:1478017597516681387> Viewers",
                value: live.viewer_count.toLocaleString(),
                inline: true,
              },
            ])
            .setColor(0xe4e29e)
            .setThumbnail(
              "https://static-cdn.jtvnw.net/jtv_user_pictures/03e3d2fb-71a6-4c5a-955d-b28d48908d2f-profile_image-300x300.png",
            )
            .setImage(`${live.thumbnail_url}?t=${Date.now()}`)
            .setTimestamp(moment(live.started_at).toDate())
            .setURL("https://twitch.tv/ranniria"),
        ],
      };

      Twitch.#last_announcement =
        (has_been_announced
          ? await Twitch.#last_announcement!.edit(props)
          : await ranni_guild.channels?.twitch.send(props)) ?? null;
    };

    const handleClips = async () => {
      const clips = await Twitch.#getClips(Twitch.#last_clip_date);

      if (clips.length)
        Twitch.#last_clip_date = moment(clips.at(-1)!.created_at);

      for (const {
        title,
        creator_name,
        duration,
        thumbnail_url,
        created_at,
        url,
      } of clips)
        await ranni_guild.channels?.clips.send({
          embeds: [
            new CustomEmbed()
              .setTitle("🎬 NEW CLIP 🎬")
              .setFields([
                {
                  name: "💬 Title",
                  value: title,
                },
                {
                  name: "👤 Creator",
                  value: (() => {
                    const value = Twitch.pending_clips.get(url) || creator_name;
                    Twitch.pending_clips.delete(url);

                    return value;
                  })(),
                  inline: true,
                },
                {
                  name: "⏰ Duration",
                  value: `${duration} sec`,
                  inline: true,
                },
              ])
              .setColor(0xe4e29e)
              .setImage(thumbnail_url)
              .setThumbnail(
                "https://static-cdn.jtvnw.net/jtv_user_pictures/03e3d2fb-71a6-4c5a-955d-b28d48908d2f-profile_image-300x300.png",
              )
              .setTimestamp(moment(created_at).toDate())
              .setURL(url),
          ],
        });
    };

    await handleLive();
    if (is_live) await handleClips();
  };
}

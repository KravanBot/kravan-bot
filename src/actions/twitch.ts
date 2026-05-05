import moment from "moment";
import { Moment } from "moment";

type TwitchToken = {
  accessToken: string;
  expiresAt: number;
};

export class Twitch {
  static #BROADCASTER_ID = "1207016011";

  #token: TwitchToken | null;

  constructor() {
    this.#token = null;
  }

  async #getAppToken(): Promise<TwitchToken> {
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
  }

  async #refreshToken() {
    const REFRESH_BUFFER = 2 * 60 * 1000;

    if (!this.#token || Date.now() >= this.#token.expiresAt - REFRESH_BUFFER)
      this.#token = await this.#getAppToken();
  }

  async getClips(last_clip_date: Moment) {
    await this.#refreshToken();

    const format = (date: Moment) => date.format("YYYY-MM-DD[T]HH:mm:ss[Z]");

    const res = await fetch(
      `https://api.twitch.tv/helix/clips?broadcaster_id=${Twitch.#BROADCASTER_ID}&first=100&started_at=${format(last_clip_date)}&ended_at=${format(moment().utc())}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.#token!.accessToken!}`,
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
  }

  async getLive() {
    await this.#refreshToken();

    console.log(this.#token);

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${Twitch.#BROADCASTER_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.#token!.accessToken!}`,
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
  }
}

import { WebSocketServer, WebSocket } from "ws";
import { Flame } from "./flame.js";
import { pending_clips, ranni_guild } from "../index.js";
import { CustomEmbed } from "../utils/embed.js";
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

export class StreamerBot {
  static #PORT = parseInt(process.env.PORT || "8080");

  #wss: WebSocketServer;

  constructor() {
    this.#wss = new WebSocketServer({ port: StreamerBot.#PORT });

    this.#wss.on("connection", (ws) => {
      console.log("Streamerbot connected!");

      ws.on("message", this.#handleMessage.bind(this));
    });

    console.log(`websocket server started on port ${StreamerBot.#PORT}`);
  }

  async #handleMessage(message: WebSocket.RawData) {
    try {
      const response = JSON.parse(message.toString());

      if ("error" in response) {
        console.log(response.error);
        return;
      }

      const { event, data } = response;

      switch (event) {
        case "flame": {
          const { username, message } = data;

          await Flame.sendFlameRequest(username, message);

          break;
        }

        case "newClip": {
          const { username, url } = data;

          pending_clips.set(url, username);

          break;
        }

        case "songlike": {
          const { url, name, user } = data;

          const image_url = (
            (await (
              await fetch(`https://open.spotify.com/oembed?url=${url}`)
            ).json()) as any
          ).thumbnail_url as string;

          const MUSIC_CHANNEL_ID = "1446229960741228647";

          const music_channel =
            ranni_guild?.channels.cache.get(MUSIC_CHANNEL_ID);

          if (!music_channel?.isSendable()) return;

          await music_channel.send({
            embeds: [
              new CustomEmbed()
                .setTitle(
                  "<a:gethoponspotify:1479081601915814030> Song Added <a:gethoponspotify:1479081601915814030>",
                )
                .setFields([
                  {
                    name: "🎵 Song",
                    value: name,
                    inline: true,
                  },
                  {
                    name: "👤 Added By",
                    value: user,
                    inline: true,
                  },
                ])
                .setThumbnail(image_url)
                .setColor(0x1ed760),
            ],
            components: [
              new ActionRowBuilder<ButtonBuilder>().setComponents(
                new ButtonBuilder()
                  .setLabel("Playlist")
                  .setEmoji({
                    id: "1479082396866580561",
                  })
                  .setURL(
                    "https://open.spotify.com/playlist/4oeTQREusGP9RG41nipafV",
                  )
                  .setStyle(ButtonStyle.Link),

                new ButtonBuilder()
                  .setLabel("Song")
                  .setEmoji({
                    id: "1479081633524089015",
                  })
                  .setURL(url)
                  .setStyle(ButtonStyle.Link),
              ),
            ],
          });

          break;
        }
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  }
}

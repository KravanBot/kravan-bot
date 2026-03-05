import { WebSocketServer, WebSocket } from "ws";
import { Flame } from "./flame.js";
import { pending_clips, ranni_guild } from "../index.js";
import { CustomEmbed } from "../utils/embed.js";

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
          const { song, name, user } = data;

          const MUSIC_CHANNEL_ID = "1446229960741228647";

          const music_channel =
            ranni_guild?.channels.cache.get(MUSIC_CHANNEL_ID);

          if (!music_channel?.isSendable()) return;

          await music_channel.send({
            content: song,
            embeds: [
              new CustomEmbed()
                .setTitle("🎵 Song Added 🎵")
                .setFields([
                  {
                    name: "🎹 Song",
                    value: name,
                    inline: true,
                  },
                  {
                    name: "👤 Added By",
                    value: user,
                    inline: true,
                  },
                ])
                .setColor(0x1ed760),
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

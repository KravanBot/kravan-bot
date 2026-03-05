import { WebSocketServer, WebSocket } from "ws";
import { Flame } from "./flame.js";
import { pending_clips } from "../index.js";

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
          const { url } = data;

          console.log(url);

          break;
        }
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  }
}

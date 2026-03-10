import { Message } from "discord.js";
import { client } from "../index.js";

export class Logger {
  static #METHODS: ("log" | "warn" | "error" | "info")[] = [
    "log",
    "warn",
    "error",
    "info",
  ];
  static #LOG_CHANNEL_ID = "1480968833056641126";
  static #MAX_LENGTH = 1990;

  #log_msg: Message<boolean> | null;
  #queue: { type: string; args: any[] }[];

  constructor() {
    this.#log_msg = null;
    this.#queue = [];

    Logger.#METHODS.forEach((method) => {
      const original = console[method];

      console[method] = (...args) => {
        this.#handleLog(method, args);
        original.apply(console, args);
      };
    });

    process.on("uncaughtException", (err) => {
      this.#handleLog("uncaughtException", [err]);
    });

    process.on("unhandledRejection", (reason, promise) => {
      this.#handleLog("unhandledRejection", [reason]);
    });

    process.on("warning", (warning) => {
      this.#handleLog("warning", [warning]);
    });

    setInterval(async () => {
      await this.#sendQueue();
    }, 5000);
  }

  async #sendQueue() {
    if (!client?.isReady()) return;
    if (!this.#queue.length) return;

    try {
      const channel = client.channels.cache.get(Logger.#LOG_CHANNEL_ID);
      if (!channel || !channel.isSendable()) return;

      const chunk =
        "```\n" +
        this.#queue
          .map((log) => this.#formatLog(log.type, log.args))
          .join("\n") +
        "\n```";

      this.#queue = [];

      if (!this.#log_msg) {
        this.#log_msg = await channel.send({
          content: chunk.slice(0, Logger.#MAX_LENGTH),
        });
        return;
      }

      const current = this.#log_msg.content ?? "";

      const combined = current + "\n" + chunk;

      if (combined.length > Logger.#MAX_LENGTH) {
        this.#log_msg = await channel.send({
          content: chunk.slice(0, Logger.#MAX_LENGTH),
        });
        return;
      }

      this.#log_msg = await this.#log_msg.edit({
        content: combined,
      });
    } catch (err) {
      process.stdout.write("Logger sendQueue error: " + err + "\n");
    }
  }

  async #handleLog(type: string, args: any[]) {
    this.#queue.push({ type, args });
  }

  #formatLog(type: string, args: any[]) {
    const timestamp = new Date().toISOString();

    const text = args
      .map((a) => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === "object") return JSON.stringify(a, null, 2);
        return String(a);
      })
      .join(" ");

    return `[${timestamp}] ${type.toUpperCase()}: ${text}`;
  }
}

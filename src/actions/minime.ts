import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  AttachmentBuilder,
  CacheType,
  ChatInputCommandInteraction,
} from "discord.js";
import fs from "fs/promises";
import path from "path";

export class MiniMe {
  static #PATH = path.join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "assets",
    "customizables",
  );
  static #ORDER = [
    "wig_back",
    "base",
    "wig_front",
    "shoes",
    "pants",
    "shirt",
    "expression",
    "mask",
    "hat",
  ];

  #interaction: ChatInputCommandInteraction<CacheType>;

  constructor(interaction: ChatInputCommandInteraction<CacheType>) {
    this.#interaction = interaction;

    (async () => {
      await this.#sendCanvas();
    })();
  }

  async #createCanvas() {
    // TODO: get from db
    const customizables: Record<string, number | null> = {
      base: 1,
      wig: 1,
      pants: 1,
      hat: 1,
      shirt: 2,
      shoes: 1,
    };

    if (!customizables["base"]) return null;

    const base = await loadImage(
      await fs.readFile(
        path.join(MiniMe.#PATH, "base", `${customizables["base"]}.png`),
      ),
    );
    const canvas = createCanvas(base.width, base.height);
    const context = canvas.getContext("2d");

    if ("wig" in customizables) {
      customizables["wig_front"] = customizables["wig"];
      customizables["wig_back"] = customizables["wig"];

      delete customizables["wig"];
    }

    for (const item of MiniMe.#ORDER) {
      if (!(item in customizables)) continue;

      const id = customizables[item];

      if (!id) continue;

      try {
        const item_img =
          item == "base"
            ? base
            : await loadImage(
                await fs.readFile(path.join(MiniMe.#PATH, item, `${id}.png`)),
              );

        context.drawImage(item_img, 0, 0, canvas.width, canvas.height);
      } catch {
        continue;
      }
    }

    return canvas;
  }

  async #sendCanvas() {
    const canvas = await this.#createCanvas();

    if (!canvas) return;

    const attachment_name = "avatar.png";

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: attachment_name,
    });

    await this.#interaction.reply({
      files: [attachment],
    });
  }
}

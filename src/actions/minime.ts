import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
} from "discord.js";
import fs from "fs/promises";
import path from "path";
import {
  getMinime,
  hasEnoughCoins,
  prisma,
  putOnMinime,
  takeCoins,
} from "../db/prisma.js";
import { JsonObject } from "@prisma/client/runtime/client";

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
    "bracelet",
    "expression",
    "mask",
    "hat",
  ];
  static #COST = 10_000;

  #interaction: ChatInputCommandInteraction<CacheType>;
  #target_id: string;

  constructor(interaction: ChatInputCommandInteraction<CacheType>) {
    this.#interaction = interaction;
    this.#target_id =
      interaction.options.getUser("target")?.id ?? interaction.user.id;

    (async () => {
      await this.#sendCanvas();
    })();
  }

  async #createCanvas() {
    const customizables = await getMinime(this.#target_id);

    if (!customizables || !customizables["base"]) return null;

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

  async #sendUnlock() {
    const msg = await this.#interaction.reply({
      content: `You havent unlocked your mini-me. Do you want to unlock it?`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("yes")
            .setLabel("Yes (🪙 10K)")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("no")
            .setLabel("No")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });

    let response = "no";

    try {
      response = (
        await msg?.awaitMessageComponent({
          filter: (i) => i.user.id === this.#interaction.user.id,
          time: 60_000,
        })
      ).customId;
    } catch {}

    if (response == "no") return await this.#interaction.deleteReply();

    if (!(await hasEnoughCoins(this.#interaction.user.id, MiniMe.#COST)))
      return await this.#interaction.editReply({
        content: "You dont have enough in ur wallet!",
        components: [],
      });

    await takeCoins(this.#interaction.user.id, MiniMe.#COST);
    await putOnMinime(this.#interaction.user.id, { base: 1 }, {});

    await this.#interaction.editReply({
      content: "SUCCESSFULLY UNLOCKED YOUR MINIME!!",
      components: [],
    });
  }

  async #sendCanvas() {
    const canvas = await this.#createCanvas();

    if (!canvas) {
      if (this.#interaction.user.id == this.#target_id)
        return await this.#sendUnlock();

      return await this.#interaction.reply("TARGET DID NOT UNLOCK HIS MINIME");
    }

    const attachment_name = "avatar.png";

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: attachment_name,
    });

    await this.#interaction.reply({
      files: [attachment],
    });
  }
}

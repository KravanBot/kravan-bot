import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  AttachmentBuilder,
  CacheType,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import { CustomEmbed } from "../utils/embed.js";

enum Memes {
  TAKE_MONEY,
}

type MemeT = {
  name: string;
  image: string;
  avatars: { x: number; y: number; size: number }[];
};

export class Meme {
  static MEMES: Record<Memes, MemeT> = {
    [Memes.TAKE_MONEY]: {
      name: "Take my money",
      image: "https://imgflip.com/s/meme/Shut-Up-And-Take-My-Money-Fry.jpg",
      avatars: [
        {
          x: 110,
          y: 25,
          size: 175,
        },
      ],
    },
  };

  #meme: MemeT;
  #users: User[];
  #interaction: ChatInputCommandInteraction<CacheType>;

  constructor(interaction: ChatInputCommandInteraction<CacheType>) {
    const type: Memes = parseInt(interaction.options.getString("meme", true));

    this.#meme = Meme.MEMES[type];
    this.#users = [interaction.options.getUser("user1", true)];
    this.#interaction = interaction;

    const user2 = interaction.options.getUser("user2");

    if (user2) this.#users.push(user2);

    (async () => {
      if (!(await this.#validateUsers())) return;

      await this.#sendCanvas();
    })();
  }

  async #validateUsers() {
    const expected = this.#meme.avatars.length;
    const got = this.#users.length;

    if (expected == got) return true;

    await this.#interaction.reply(`Expected ${expected} users, got ${got}`);

    return false;
  }

  async #createCanvas() {
    const background = await loadImage(this.#meme.image);

    const canvas = createCanvas(background.width, background.height);
    const context = canvas.getContext("2d");

    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    for (let i = 0; i < this.#meme.avatars.length; i++) {
      const cords = this.#meme.avatars.at(i)!;
      const avatar_url = this.#users.at(i)!.avatarURL();

      if (!avatar_url) return null;

      context.drawImage(
        await loadImage(avatar_url),
        cords.x,
        cords.y,
        cords.size,
        cords.size,
      );
    }

    return canvas;
  }

  async #sendCanvas() {
    const canvas = await this.#createCanvas();

    if (!canvas)
      return await this.#interaction.reply(
        "Error loading avatars for these users :(",
      );

    const attachment_name = "meme.png";

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: attachment_name,
    });

    await this.#interaction.reply({
      embeds: [new CustomEmbed().setImage(`attachment://${attachment_name}`)],
      files: [attachment],
    });
  }
}

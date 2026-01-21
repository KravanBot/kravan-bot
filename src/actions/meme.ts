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
  COOKING,
  STONKS,
}

type MemeT = {
  name: string;
  image: string;
  avatars: { x: number; y: number; size: number }[];
};

export class Meme {
  static MEMES: Map<Memes, MemeT> = new Map<Memes, MemeT>()
    .set(Memes.TAKE_MONEY, {
      name: "Take my money",
      image: "https://imgflip.com/s/meme/Shut-Up-And-Take-My-Money-Fry.jpg",
      avatars: [
        {
          x: 133,
          y: 58,
          size: 136,
        },
      ],
    })
    .set(Memes.COOKING, {
      name: "Cooking",
      image:
        "https://instagram.ftlv6-1.fna.fbcdn.net/v/t51.29350-15/394556382_287308694224822_9173530909992844440_n.jpg?stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQuaW1hZ2VfdXJsZ2VuLjc1MHg3NDQuc2RyLmYyOTM1MC5kZWZhdWx0X2ltYWdlLmMyIn0&_nc_ht=instagram.ftlv6-1.fna.fbcdn.net&_nc_cat=110&_nc_oc=Q6cZ2QGupJt_yqAMObPHvWQDJR6kByHuCRbWzV3_xW0vsj2ZwOf7IgLYPyjTgUKcseQll-s&_nc_ohc=l--Iye8Wm9kQ7kNvwEpAxC6&_nc_gid=dT4xlwvtRN_bxUlfjrtSJg&edm=APs17CUBAAAA&ccb=7-5&ig_cache_key=MzIyMDMwNjEzNzAzMDc3NjI2OA%3D%3D.3-ccb7-5&oh=00_AfofUGJugiFm2qdv86UF4ZyWhz2aInhWtBToK5r37ipjoA&oe=69769A49&_nc_sid=10d13b",
      avatars: [
        {
          x: 145,
          y: 240,
          size: 128,
        },
      ],
    })
    .set(Memes.STONKS, {
      name: "Stonks",
      image: "https://i.imgflip.com/3388rw.png",
      avatars: [
        {
          x: 108,
          y: 45,
          size: 175,
        },
      ],
    });

  #meme: MemeT;
  #users: User[];
  #interaction: ChatInputCommandInteraction<CacheType>;

  constructor(interaction: ChatInputCommandInteraction<CacheType>) {
    const type: Memes = parseInt(interaction.options.getString("meme", true));

    this.#meme = Meme.MEMES.get(type)!;
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
      files: [attachment],
    });
  }
}

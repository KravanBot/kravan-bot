import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  AttachmentBuilder,
  CacheType,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import path from "node:path";
import fs from "fs/promises";

enum Memes {
  TAKE_MONEY,
  COOKING,
  STONKS,
  SAVIOR,
  CHILL_GUY,
  BROKE,
  CHASE,
  OMEN,
  DOUPLEGANGER,
  RIP,
  IDK,
  COMMUNIST,
  GIVE_UP,
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
      image: path.join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "assets",
        "memes",
        "cooking.jpg",
      ),
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
    })
    .set(Memes.SAVIOR, {
      name: "Savior",
      image: "https://i.imgflip.com/3p5foq.jpg",
      avatars: [
        {
          x: 425,
          y: 205,
          size: 270,
        },
        {
          x: 650,
          y: 803,
          size: 150,
        },
      ],
    })
    .set(Memes.CHILL_GUY, {
      name: "Chill guy",
      image: "https://i.imgflip.com/9au02y.jpg",
      avatars: [
        {
          x: 125,
          y: 93,
          size: 150,
        },
      ],
    })
    .set(Memes.BROKE, {
      name: "Broke",
      image: "https://i.imgflip.com/3kobxz.jpg",
      avatars: [
        {
          x: 340,
          y: 40,
          size: 190,
        },
      ],
    })
    .set(Memes.CHASE, {
      name: "Chase",
      image: "https://i.imgflip.com/2wpud7.png",
      avatars: [
        {
          x: 245,
          y: 100,
          size: 100,
        },
        {
          x: 375,
          y: 270,
          size: 100,
        },
      ],
    })
    .set(Memes.OMEN, {
      name: "Omen",
      image: "https://i.imgflip.com/aipc1v.jpg",
      avatars: [
        {
          x: 200,
          y: 65,
          size: 100,
        },
      ],
    })
    .set(Memes.DOUPLEGANGER, {
      name: "Doupleganger",
      image: "https://i.imgflip.com/1tkjq9.jpg",
      avatars: [
        {
          x: 190,
          y: 18,
          size: 70,
        },
        {
          x: 560,
          y: 22,
          size: 70,
        },
      ],
    })
    .set(Memes.RIP, {
      name: "RIP",
      image: "https://i.imgflip.com/3nx72a.png",
      avatars: [
        {
          x: 85,
          y: 165,
          size: 75,
        },
        {
          x: 230,
          y: 198,
          size: 75,
        },
      ],
    })
    .set(Memes.IDK, {
      name: "Idk man",
      image: "https://i.imgflip.com/1lj6ra.jpg",
      avatars: [
        {
          x: 158,
          y: 30,
          size: 130,
        },
      ],
    })
    .set(Memes.COMMUNIST, {
      name: "Communist",
      image: "https://i.imgflip.com/44eggm.png",
      avatars: [
        {
          x: 200,
          y: 65,
          size: 125,
        },
      ],
    })
    .set(Memes.GIVE_UP, {
      name: "Give Up",
      image: "https://i.imgflip.com/5lc1pb.jpg",
      avatars: [
        {
          x: 144,
          y: 88,
          size: 50,
        },
        {
          x: 322,
          y: 248,
          size: 50,
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
    const background = this.#meme.image.startsWith("http")
      ? await loadImage(this.#meme.image)
      : await loadImage(await fs.readFile(this.#meme.image));

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

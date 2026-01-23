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
  SAVIOR,
  CHILL_GUY,
  BROKE,
  CHASE,
  OMEN,
  RAW,
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
      image:
        "https://scontent.ftlv5-1.fna.fbcdn.net/v/t1.6435-9/157375125_10158379186214822_5596869456124347766_n.png?_nc_cat=107&ccb=1-7&_nc_sid=127cfc&_nc_ohc=7J2HRaMtAeoQ7kNvwGrQ1pW&_nc_oc=Adl7jCwGxH9D5WmtWMKEq5xtqo3DaGZQNrxdvk21rO0SFwCtH2RSrd7iGk4MTaK9ChM&_nc_zt=23&_nc_ht=scontent.ftlv5-1.fna&_nc_gid=TQiCiKx2wDloXki_q23Jzg&oh=00_AfrQUMmAw3bDvH7B0H5ik2lxmY5oL708eP5M1_wH0LaFdg&oe=6998A7FF",
      avatars: [
        {
          x: 235,
          y: 120,
          size: 105,
        },
        {
          x: 367,
          y: 297,
          size: 105,
        },
      ],
    })
    .set(Memes.OMEN, {
      name: "Omen",
      image:
        "https://media.discordapp.net/attachments/1439321657108861050/1463871549315485801/966FAE68-5CEE-49E4-8024-A85A0D8A4BD3.jpg?ex=6973681e&is=6972169e&hm=dd90e314d7a3b402b5b95913aca9657f19385de5d5f330ccb195bd98041c5cf7&=&format=webp&width=437&height=470",
      avatars: [
        {
          x: 150,
          y: 40,
          size: 100,
        },
      ],
    })
    .set(Memes.RAW, {
      name: "Raw",
      image:
        "https://cdn.discordapp.com/attachments/1439321657108861050/1463924560066777161/iu_.png?ex=6973997d&is=697247fd&hm=a6467028f08dc1bd0db224e3405632ddca3c6ee976f40ef42c7d13b19bfec331&",
      avatars: [
        {
          x: 820,
          y: 0,
          size: 465,
        },
      ],
    })
    .set(Memes.DOUPLEGANGER, {
      name: "Doupleganger",
      image:
        "https://media.discordapp.net/attachments/1439321657108861050/1463926699841425470/1tkjq9.png?ex=69739b7b&is=697249fb&hm=d307e8b1a8c0fb813c47d015244c4b599aa1b7c2336392b5c8ad57a4b804ea30&=&format=webp&quality=lossless&width=880&height=495",
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
      image:
        "https://media.discordapp.net/attachments/1439321657108861050/1463927495131791604/1lj6ra.png?ex=69739c39&is=69724ab9&hm=824da5e70070b2beddc73c4796f6d8e9faa32ed3234b6b29c61aa4ca11654899&=&format=webp&quality=lossless&width=422&height=344",
      avatars: [
        {
          x: 150,
          y: 35,
          size: 125,
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
      image:
        "https://media.discordapp.net/attachments/1459659790417399960/1464190289941102592/hq720.png?ex=697490f8&is=69733f78&hm=29e4f6ae3d4eb366e18ef1b88fe6d8011f786bda4e434a0a7ab75f2e68e896c7&=&format=webp&quality=lossless&width=755&height=425",
      avatars: [
        {
          x: 160,
          y: 65,
          size: 50,
        },
        {
          x: 360,
          y: 230,
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

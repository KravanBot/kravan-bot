import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Message,
} from "discord.js";
import { addCoins, getUserCoins, takeCoins } from "../db/prisma.js";
import { getRandomFromArray } from "../utils/helpers.js";
import { CustomEmbed } from "../utils/embed.js";
import { current_gambles } from "../index.js";

type InteractionT = ChatInputCommandInteraction<CacheType>;

export class Gamble {
  static #good_emoji = "<a:RavenTwerk:1388053524893401201>";
  static #bad_emoji = "<a:animeStressed:1311475923006128129>";

  #interaction: InteractionT;
  #bet: number;
  #sequence: string[];
  #revealed: number;

  constructor(interaction: InteractionT) {
    this.#interaction = interaction;
    this.#bet = interaction.options.getNumber("bet", true);
    this.#sequence = this.#chooseSequence();
    this.#revealed = 0;

    (async () => {
      if (!(await this.#canGamble())) return;

      await this.#sendGambleMessage();
    })();
  }

  async #canGamble() {
    if ((await getUserCoins(this.#interaction.user.id)) < this.#bet) {
      this.#interaction.reply("U A BROKE MF U CANT BET THIS MUCH");
      return false;
    }

    return true;
  }

  #chooseSequence(): string[] {
    return Array.from({ length: 5 }, () => this.#chooseRandomEmoji());
  }

  #chooseRandomEmoji(): string {
    const random = Math.floor(Math.random() * 15);

    if (random <= 0) return Gamble.#bad_emoji;
    if (random <= 1) return Gamble.#good_emoji;

    return getRandomFromArray([
      // "<:Raven_RiP:1386395346057433301>",
      "<:EvilSmile:1311471459641589790>",
      "<a:evilcat:1432751141254467815>",
      // "<a:stareShock:1385075817796734996>",
      "<a:TOAAAD:1385075517904130129>",
    ]);
  }

  async #sendGambleMessage() {
    if (!this.#interaction.replied) await this.#interaction.reply("Loading...");

    let msg;

    while (this.#revealed < this.#sequence.length) {
      msg = await this.#interaction.editReply({
        content: `${this.#sequence
          .slice(0, this.#revealed)
          .join(" ")} ${new Array(this.#sequence.length - this.#revealed)
          .fill("❓")
          .join(" ")}`,
        embeds: [
          new CustomEmbed()
            .setTitle("GAMBLING TIME 🎰")
            .setThumbnail(this.#interaction.user.avatarURL())
            .setDescription(
              `Test your luck, and u might get a jackpot! You need at least 3 indentical emotes to earn a profit.\n\n- ${
                Gamble.#good_emoji
              } - Earn your bet back\n- ${
                Gamble.#bad_emoji
              } - Half of your bet is being reduced`
            )
            .setFields([
              {
                name: "Bet",
                value: `🪙 ${this.#bet} coins`,
              },
            ])
            .setColor(0x345eeb),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("Reveal Next")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("all")
              .setLabel("Reveal All")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });

      if (!(await this.#checkRevealClicked(msg)))
        return current_gambles.delete(this.#interaction.user.id);
    }

    await new Promise((res, _) => {
      setTimeout(() => {
        res("");
      }, 1000);
    });

    await this.#sendResults();

    current_gambles.delete(this.#interaction.user.id);
  }

  async #checkRevealClicked(msg: Message<boolean>) {
    try {
      const interaction = await msg.awaitMessageComponent({
        filter: (i) => i.user.id === this.#interaction.user.id,
        time: 60_000,
      });
      interaction.deferUpdate();

      if (interaction.customId == "next") this.#revealed++;
      else this.#revealed = this.#sequence.length;

      return true;
    } catch (e) {
      await this.#interaction.editReply({
        content: "BRO U CANT GO WHILE YOU ARE GAMBLING",
        embeds: [],
        components: [],
      });

      await takeCoins(this.#interaction.user.id, this.#bet);

      return false;
    }
  }

  async #sendResults() {
    const counts = new Map<string, number>();

    let winnings = 0;
    let losses = this.#bet;

    for (const emoji of this.#sequence) {
      const new_val = (counts.get(emoji) ?? 0) + 1;
      counts.set(emoji, new_val);
    }

    const winningsForEmoji = (emoji: string) => {
      const value = counts.get(emoji) ?? 0;
      let sum = 0;

      sum +=
        emoji == Gamble.#good_emoji
          ? value * this.#bet
          : emoji == Gamble.#bad_emoji
          ? -value * (Math.floor(this.#bet / 2) + (this.#bet % 2))
          : 0;

      sum += value >= 3 ? this.#bet * Math.pow(2, value - 2) : 0;

      return sum;
    };

    const results = Array.from(
      counts.entries().map(([emoji, num]) => {
        const emoji_winnings = winningsForEmoji(emoji);
        winnings += emoji_winnings;

        return `- ${emoji} - ${num} ${
          emoji_winnings
            ? `(${emoji_winnings < 0 ? "" : "+"}${emoji_winnings} 🪙)`
            : ""
        }`;
      })
    );

    const embeds = [];
    let delta = winnings - losses;
    let attachment = undefined;

    if (Math.floor(Math.random() * 20) <= 0) {
      const lucky_sequence = this.#getLuckySequence(delta);
      attachment = lucky_sequence.attachment;

      winnings += lucky_sequence.additional;
      embeds.push(lucky_sequence.embed);
    }

    delta = winnings - losses;

    embeds.push(
      new CustomEmbed()
        .setColor(0x345eeb)
        .setThumbnail(this.#interaction.user.avatarURL())
        .addFields([
          {
            name: "Sequence",
            value: this.#sequence.join(" "),
          },
          {
            name: "Results",
            value: `${results.join("\n")}`,
            inline: true,
          },
          {
            name: delta < 0 ? "Loss" : "Profit",
            value: `- ${delta} 🪙`,
            inline: true,
          },
        ])
    );

    await this.#interaction.editReply({
      content: "",
      embeds,
      components: [],
      files: attachment ? [attachment] : [],
    });

    if (!delta) return;

    await addCoins(this.#interaction.user.id, delta);
  }

  #getLuckySequence(delta: number) {
    const sequences: {
      name: string;
      description: string;
      additional: number;
      thumbnail: string;
      img: string;
    }[] = [
      {
        name: "Ranni Blessing 🙌",
        description:
          delta < 0
            ? "Ranni returned your loss! You did not lose anything thanks to her 🐦‍⬛"
            : "Ranni blessed u with double ur profit!",
        additional: Math.abs(delta),
        thumbnail:
          "https://images-ext-1.discordapp.net/external/A2LqMVrjhBYIHCEmmiKlr_NeUcXUW0121R3aEyZr-DY/https/cdn.discordapp.com/avatars/1260205513795174434/eb36b363bde1d4f592af5625b098a61b.webp?format=webp&width=141&height=141",
        img: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2tsd2x3aTZ4ODg0d2dneTdvaWZ1cWlnNmZmNnV3eTV5Nnd6Y3RvdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/KPPltOgm0hEtbjjDN0/giphy.gif",
      },
      {
        name: "Beanie Kisses 💋",
        description: "Beanie smootches you with an additional 20 coins!",
        additional: 20,
        thumbnail:
          "https://images-ext-1.discordapp.net/external/0m5FBCrNv_WBvk6pQ13Qm0G2uvylVYN3r4JmnRU4vFQ/https/cdn.discordapp.com/avatars/711280320066093077/30e97bc8175abc367207042f3474f0ec.webp?format=webp&width=141&height=141",
        img: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExa204dHVvcDh0bHc4bnZjM2Jya2xxOWxuYTZhemQ2bWVmd2pkcXEzbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/W1hd3uXRIbddu/giphy.gif",
      },
      {
        name: "Goobie Incident 🚽",
        description:
          "Goobie smashed his head against the toilet... again... u donate him 20 coins for his medication 💊",
        additional: -20,
        thumbnail:
          "https://images-ext-1.discordapp.net/external/kgMjqZhFstRqlg32jZNszMxlG14L5l0wlNqcLKYlTWQ/https/cdn.discordapp.com/guilds/1236751656331509967/users/508655899309506570/avatars/7efb04f6f79659b4e9dfc1ce0454e8cc.webp?format=webp&width=141&height=141",
        img: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGs0ZjZmNHg2OHk3cXg1aDE4cHFrazh1c2Q5YzkxajZoMnEwY2kyNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bYOLaSoPdvy00/giphy.gif",
      },
      {
        name: "Cant sleep with sleepy 😴",
        description:
          "Sleepy says peek with me... you dont... you dont... he drops your wallet angrily, 20 coins arent with us anymore.",
        additional: -20,
        thumbnail:
          "https://cdn.discordapp.com/avatars/973969392146710568/702e0414a562e36dea4a4553b8c7e816.png",
        img: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBnOHBhaGtrN3d6c3U1czBiOGg1YzQzMmxtcTEzbG5vajc2M216dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EzTyrBGeAmDSsToZxb/giphy.gif",
      },
      {
        name: "Boom Boom Boom 💥",
        description: "Djevrek exploded in your room - you lose 20 coins",
        additional: -20,
        thumbnail:
          "https://images-ext-1.discordapp.net/external/-9DhIh-pt4yrV3DHkV-xfAbY9pqdi5cxAIHtjREPTLw/https/cdn.discordapp.com/avatars/617091659758436516/a_452edccff6f1e7d6f05ffdf6610f4083.gif?width=141&height=141",
        img: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWJubndhazd4ODYwcjN6OWRwMHhoZGh1Njd2empiMTMxNHFldjRpaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/14ceV8wMLIGO6Q/giphy.gif",
      },
      {
        name: "Will never be the same... 😶",
        description:
          "Zed said type shit, you are forced to play a game of league with him, you lost all your sanity and you are sent to an insistuation. You pay 20 coins for a psychology session.",
        additional: -20,
        thumbnail:
          "https://images-ext-1.discordapp.net/external/wN38Q6t1nHa0xXycCaJqBUyVNcdIYF22Ggo7H2WeHSg/https/cdn.discordapp.com/avatars/133282052350017536/3dc22cb19049d7b675c9365f224cd565.webp?format=webp&width=141&height=141",
        img: "./assets/gifs/zed_sequence.gif",
      },
      {
        name: "Drop ur pants 👖",
        description:
          "Mayaya complimented with a 'Nice cock', u excitingly dropped ur pants and she tipped u 20 coins",
        additional: 20,
        thumbnail:
          "https://images-ext-1.discordapp.net/external/Wgiuq3nMi7tybLKo7BG_8BRtxNbeJ0ok7S5LXqeY2hc/https/cdn.discordapp.com/guilds/1236751656331509967/users/756137226202513449/avatars/d668a8acf3a50617434a25d176dcb3d1.webp?format=webp&width=141&height=141",
        img: "./assets/gifs/mayaya_sequence.gif",
      },
      {
        name: "TAKE COVER 🗡️",
        description: "Teru invaded your country and took your loved ones captive. She spares their lives for 20 coins",
        additional: -20,
        thumbnail: "https://images-ext-1.discordapp.net/external/e6jfZPmsfCN8z2FnCfSHHWhh6IZ2ojdJsw7FEk9pVEA/https/cdn.discordapp.com/avatars/709841153763180545/fa19a1f558640c92d4e2c52df61c12cd.webp?format=webp&width=141&height=141",
        img: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm91d3Q1ZTU1YTR0d3poMXZyaWhvNXA0M2hkdjY0NGl6aHhzMjB2YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT8qBogOUbxKWN3WXm/giphy.gif"
      }
    ];

    const selected =
      Math.floor(Math.random() * 2) <= 0
        ? getRandomFromArray(sequences.filter((el) => el.additional > 0))
        : getRandomFromArray(sequences.filter((el) => el.additional < 0));

    const is_img_url = selected.img.startsWith("https");
    const attachment_name = is_img_url
      ? undefined
      : selected.img.split("/").at(-1)!;

    return {
      additional: selected.additional,
      embed: new CustomEmbed()
        .setTitle("SUPA DUPA LUCKY (or not?) 🎲")
        .setColor(0x6434eb)
        .setFields([
          {
            name: selected.name,
            value: selected.description,
          },
        ])
        .setThumbnail(selected.thumbnail)
        .setImage(
          is_img_url ? selected.img : `attachment://${attachment_name}`
        ),
      attachment: attachment_name
        ? new AttachmentBuilder(selected.img).setName(attachment_name)
        : undefined,
    };
  }
}

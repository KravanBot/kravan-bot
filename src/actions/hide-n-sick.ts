import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  userMention,
} from "discord.js";
import { CustomEmbed } from "../utils/embed.js";
import { getRandomFromArray } from "../utils/helpers.js";
import moment from "moment";
import { client } from "../index.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs/promises";
import path from "path";
import { addCoins, hasEnoughCoins, takeCoins } from "../db/prisma.js";

type InteractionT = ChatInputCommandInteraction<CacheType>;

enum RoomsE {
  REYNA = 1,
  JETT,
}

export class HideAndSeek {
  static #COST = 10;
  static #ONE_TO_TEN_ARR = new Array(10).fill(0).map((_, idx) => idx + 1);
  static #PATH = "./assets/hide-n-seek";
  static #SPOTS: Record<RoomsE, Record<number, { x: number; y: number }>> = {
    [RoomsE.REYNA]: {
      1: {
        x: 425,
        y: 275,
      },
      2: {
        x: 343,
        y: 432,
      },
      3: {
        x: 416,
        y: 432,
      },
      4: {
        x: 725,
        y: 310,
      },
      5: {
        x: 725,
        y: 377,
      },
      6: {
        x: 576,
        y: 612,
      },
      7: {
        x: 276,
        y: 675,
      },
      8: {
        x: 296,
        y: 734,
      },
      9: {
        x: 647,
        y: 588,
      },
      10: {
        x: 758,
        y: 663,
      },
    },
    [RoomsE.JETT]: {
      1: {
        x: 353,
        y: 347,
      },
      2: {
        x: 313,
        y: 438,
      },
      3: {
        x: 653,
        y: 281,
      },
      4: {
        x: 316,
        y: 724,
      },
      5: {
        x: 361,
        y: 724,
      },
      6: {
        x: 548,
        y: 732,
      },
      7: {
        x: 714,
        y: 732,
      },
      8: {
        x: 902,
        y: 777,
      },
      9: {
        x: 108,
        y: 120,
      },
      10: {
        x: 733,
        y: 86,
      },
    },
  };

  static #SEEKER_DATA: Record<
    number,
    {
      attempts: number;
      min_to_win: number;
    }
  > = {
    1: {
      attempts: 5,
      min_to_win: 1,
    },
    2: {
      attempts: 3,
      min_to_win: 1,
    },
    3: {
      attempts: 4,
      min_to_win: 2,
    },
    4: {
      attempts: 4,
      min_to_win: 2,
    },
    5: {
      attempts: 5,
      min_to_win: 3,
    },
    6: {
      attempts: 5,
      min_to_win: 3,
    },
    7: {
      attempts: 6,
      min_to_win: 4,
    },
  };

  #interaction: InteractionT;

  #seeker: string | null;
  #hiders: Map<string, string>;
  #map: Map<number, string[]>;
  #room: RoomsE;

  constructor(interaction: InteractionT) {
    this.#interaction = interaction;
    this.#seeker = null;
    this.#hiders = new Map();
    this.#map = new Map();
    this.#room = getRandomFromArray([RoomsE.REYNA, RoomsE.JETT])!;

    (async () => {
      try {
        const { hiders, seeker } = await this.#sendLobby();

        this.#hiders = hiders;
        this.#seeker = seeker;

        await this.#waitForPlayersToHide(hiders);

        await this.#seekPlayers();
      } catch {
        await interaction.deleteReply();
      }
    })();
  }

  async #sendLobby() {
    return new Promise<{
      hiders: Map<string, string>;
      seeker: string | null;
    }>(async (res, rej) => {
      const hiders: Map<string, string> = new Map();
      const seekers: Map<string, string> = new Map();

      const end_time = moment().add(5, "minutes");

      const replyOptions = () => {
        return {
          content: "",
          embeds: [
            new CustomEmbed()
              .setTitle("HIDE & SEEK")
              .setDescription(
                `Game will start <t:${Math.floor(end_time.valueOf() / 1000)}:R> or when reaching 10 players`,
              )
              .setFields(
                {
                  name: "🙈 Hiders",
                  value: Array.from(hiders.keys())
                    .map((hider) => userMention(hider))
                    .join(" "),
                  inline: true,
                },
                {
                  name: "🔍 Seekers",
                  value: Array.from(seekers.keys())
                    .map((hider) => userMention(hider))
                    .join(" "),
                  inline: true,
                },
                {
                  name: "🏆 Prize Pool",
                  value: `🪙 ${(hiders.size + seekers.size) * HideAndSeek.#COST}`,
                },
              ),
          ],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
              new ButtonBuilder()
                .setCustomId("hider")
                .setLabel("🙈 Hider")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("seeker")
                .setLabel("🔍 Seeker")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("start")
                .setLabel("✅ Start")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId("exit")
                .setLabel("❌ Exit")
                .setStyle(ButtonStyle.Danger),
            ),
          ],
        };
      };

      await this.#interaction.deferReply();

      const collector = (
        await this.#interaction.editReply(replyOptions())
      ).createMessageComponentCollector({
        time: 300_000,
      });

      collector.on("collect", async (request) => {
        await request.deferUpdate();

        switch (request.customId) {
          case "hider":
            if (hiders.has(request.user.id)) break;

            if (seekers.has(request.user.id)) seekers.delete(request.user.id);
            else if (await hasEnoughCoins(request.user.id, HideAndSeek.#COST))
              await takeCoins(request.user.id, HideAndSeek.#COST);
            else return;

            hiders.set(request.user.id, request.user.avatarURL() ?? "");

            if (hiders.size + seekers.size >= 8) {
              collector.stop();
              break;
            }

            await request.editReply(replyOptions());
            break;

          case "seeker":
            if (seekers.has(request.user.id)) break;

            if (hiders.has(request.user.id)) hiders.delete(request.user.id);
            else if (await hasEnoughCoins(request.user.id, HideAndSeek.#COST))
              await takeCoins(request.user.id, HideAndSeek.#COST);
            else return;

            seekers.set(request.user.id, request.user.avatarURL() ?? "");

            if (hiders.size + seekers.size >= 8) {
              collector.stop();
              break;
            }

            await request.editReply(replyOptions());

            break;

          case "start":
            if (
              request.user.id == this.#interaction.user.id &&
              hiders.size + seekers.size >= 2
            )
              collector.stop();

            break;

          case "exit":
            if (seekers.has(request.user.id)) {
              seekers.delete(request.user.id);
              await request.editReply(replyOptions());
            } else if (hiders.has(request.user.id)) {
              hiders.delete(request.user.id);
              await request.editReply(replyOptions());
            }

            break;
        }
      });

      collector.on("end", () => {
        if (hiders.size + seekers.size < 2) return rej();

        const seeker = getRandomFromArray(Array.from(seekers.keys()));

        if (seeker) seekers.delete(seeker);

        for (const seeker of seekers) hiders.set(seeker[0], seeker[1]);

        return res({
          hiders,
          seeker,
        });
      });
    });
  }

  async #waitForPlayersToHide(hiders: Map<string, string>) {
    await this.#interaction.editReply({
      content: "Loading...",
      embeds: [],
      components: [],
      files: [],
    });

    await new Promise<void>(async (res) => {
      const spots = new Map<string, number>();

      const msg = await this.#interaction.editReply({
        content: `🔍 Seeker is: ${userMention(this.#seeker ?? client.user!.id)}\nAll the rest, choose a spot to hide <t:${Math.floor(new Date().valueOf() / 1000) + 1 * 60}:R>`,

        embeds: [],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...HideAndSeek.#ONE_TO_TEN_ARR
              .slice(0, 5)
              .map((num) =>
                new ButtonBuilder()
                  .setCustomId(`${num}`)
                  .setLabel(`${num}`)
                  .setStyle(ButtonStyle.Secondary),
              ),
          ),
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...HideAndSeek.#ONE_TO_TEN_ARR
              .slice(5)
              .map((num) =>
                new ButtonBuilder()
                  .setCustomId(`${num}`)
                  .setLabel(`${num}`)
                  .setStyle(ButtonStyle.Secondary),
              ),
          ),
        ],
        files: [
          new AttachmentBuilder(
            path.join(HideAndSeek.#PATH, `${this.#room}.jpg`),
          ).setName("place.jpg"),
        ],
      });

      const collector = msg.createMessageComponentCollector({
        filter: (i) => hiders.has(i.user.id),
        time: 60_000,
      });

      collector.on("collect", async (request) => {
        await request.deferUpdate();

        const spot = parseInt(request.customId);

        if (spots.has(request.user.id)) return;

        spots.set(request.user.id, spot);

        if (spots.size >= hiders.size) collector.stop();
      });

      collector.on("end", () => {
        for (const id of Array.from(hiders.keys()))
          if (!spots.has(id)) spots.set(id, Math.floor(Math.random() * 10) + 1);

        this.#map = Array.from(spots.entries()).reduce((prev, [id, spot]) => {
          prev.set(spot, [...(prev.get(spot) ?? []), id]);

          return prev;
        }, this.#map);

        return res();
      });
    });
  }

  async #seekPlayers() {
    const { attempts, min_to_win } =
      HideAndSeek.#SEEKER_DATA[this.#hiders.size]!;
    const spots_discovered: Set<number> = new Set();

    const msg = await this.#interaction.editReply({
      content: `Everyone chose a spot! ${userMention(this.#seeker ?? client.user!.id)}, its time for u to cook...\nYou have ${attempts} attempts to find at least ${min_to_win} <t:${Math.floor(new Date().valueOf() / 1000) + 2 * 60}:R> to gain profit!`,
    });

    let attempt = 0;
    let found_by_seeker = 0;

    const handleDiscoverSpot = async (spot: number) => {
      if (spots_discovered.has(spot)) return;

      spots_discovered.add(spot);

      attempt++;

      found_by_seeker += this.#map.get(spot)?.length ?? 0;

      await this.#getCanvasAttachment(spots_discovered, false);

      if (found_by_seeker >= this.#hiders.size || attempt >= attempts)
        throw new Error();
    };

    const handleResults = async () => {
      const winners: string[] = [];
      const losers: string[] = [];

      for (const [spot, hiders] of Array.from(this.#map.entries()))
        if (spots_discovered.has(spot)) losers.push(...hiders);
        else winners.push(...hiders);

      if (found_by_seeker >= min_to_win)
        winners.push(this.#seeker ?? client.user!.id);

      const prize = Math.floor(
        ((this.#hiders.size + (this.#seeker ? 1 : 0)) * HideAndSeek.#COST) /
          winners.length,
      );

      for (const winner of winners) await addCoins(winner, prize);

      await this.#interaction.editReply({
        content: "Loading...",
        components: [],
        files: [],
      });

      await this.#interaction.editReply({
        content: "",
        embeds: [
          new CustomEmbed()
            .setTitle("HIDE AND SEEK RESULTS")
            .setDescription(
              `${userMention(this.#seeker ?? client.user!.id)} managed to find ${found_by_seeker} players!`,
            )
            .setFields([
              {
                name: "🫣 Found",
                value: losers.map((loser) => userMention(loser)).join(" "),
                inline: true,
              },
              {
                name: "🎖️ Winners",
                value: winners.map((winner) => userMention(winner)).join(" "),
                inline: true,
              },
              {
                name: "🏆 Prize",
                value: `🪙 ${prize}`,
              },
            ])
            .setImage("attachment://place.jpg"),
        ],
        components: [],
        files: [await this.#getCanvasAttachment(spots_discovered, true)],
      });
    };

    if (this.#seeker) {
      const collector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id == this.#seeker,
        time: 60_000,
      });

      collector.on("collect", async (request) => {
        await request.deferUpdate();
        const spot = parseInt(request.customId);

        try {
          await handleDiscoverSpot(spot);
        } catch {
          collector.stop();
        }
      });

      collector.on("end", handleResults);
    } else {
      try {
        while (true) {
          await new Promise<void>((res) => {
            setTimeout(() => {
              return res();
            }, 2000);
          });

          await handleDiscoverSpot(
            getRandomFromArray(
              HideAndSeek.#ONE_TO_TEN_ARR.filter(
                (num) => !spots_discovered.has(num),
              ),
            )!,
          );
        }
      } catch {
        await handleResults();
      }
    }
  }

  async #createCanvas(spots_discovered: Set<number>, show_hidden: boolean) {
    const background = await loadImage(
      await fs.readFile(path.join(HideAndSeek.#PATH, `${this.#room}.jpg`)),
    );
    const x = await loadImage(
      await fs.readFile(path.join(HideAndSeek.#PATH, "x.png")),
    );

    const canvas = createCanvas(background.width, background.height);
    const context = canvas.getContext("2d");

    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    const SIZE = 45;

    const drawSpots = async (spots: Set<number>) => {
      for (const spot of spots) {
        const cords = HideAndSeek.#SPOTS[this.#room][spot]!;
        const users_in_spot = this.#map.get(spot) ?? [];

        if (!users_in_spot.length) {
          context.drawImage(x, cords.x, cords.y, SIZE, SIZE);
          continue;
        }

        const first_row = users_in_spot.slice(0, 4);
        const second_row = users_in_spot.slice(4);

        const drawRow = async (row_num: 1 | 2) => {
          const row = row_num == 1 ? first_row : second_row;

          const start_x = cords.x - (row.length - 1) * (SIZE / 2);
          let start_y = cords.y;

          if (second_row.length) start_y += row_num == 1 ? SIZE / -2 : SIZE / 2;

          for (let i = 0; i < row.length; i++) {
            const user = row[i]!;

            context.drawImage(
              await loadImage(
                this.#hiders.get(user) ||
                  "https://media.tenor.com/nqSIHZTpwXAAAAAe/discord-pfp.png",
              ),
              start_x + i * SIZE,
              start_y,
              SIZE,
              SIZE,
            );

            if (spots_discovered.has(spot))
              context.drawImage(x, start_x + i * SIZE, start_y, SIZE, SIZE);
          }
        };

        await drawRow(1);
        await drawRow(2);
      }
    };

    await drawSpots(
      show_hidden
        ? new Set([...spots_discovered, ...Array.from(this.#map.keys())])
        : spots_discovered,
    );

    return canvas;
  }

  async #getCanvasAttachment(
    spots_discovered: Set<number>,
    show_hidden: boolean,
  ) {
    const canvas = await this.#createCanvas(spots_discovered, show_hidden);

    const attachment_name = "place.jpg";

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: attachment_name,
    });
  }
}

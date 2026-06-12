import { AttachmentBuilder, GuildMember, userMention } from "discord.js";
import fs from "fs/promises";
import { ranni_guild } from "../index.js";
import { CustomEmbed } from "../utils/embed.js";

export class Welcome {
  static #NUM_OF_IMAGES = 19;
  static #welcome_imgs_order: number[] | null = null;

  constructor() {
    (async () => {
      if (Welcome.#welcome_imgs_order) return;

      await Welcome.getWelcomeImgsOrder();
    })();
  }

  static getWelcomeImgsOrder: () => Promise<void> = async () => {
    if (!!Welcome.#welcome_imgs_order) {
      Welcome.#welcome_imgs_order = Array.from({
        length: Welcome.#NUM_OF_IMAGES,
      })
        .fill(0)
        .map((_, idx) => idx + 1);

      function shuffle(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));

          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

      Welcome.#welcome_imgs_order = shuffle(Welcome.#welcome_imgs_order);

      await fs.writeFile(
        "src/info.json",
        JSON.stringify(
          {
            welcome_imgs_order: Welcome.#welcome_imgs_order,
          },
          null,
          2,
        ),
      );
    } else {
      const info = JSON.parse(await fs.readFile("src/info.json", "utf-8"));
      Welcome.#welcome_imgs_order = info.welcome_imgs_order;

      if (
        !Welcome.#welcome_imgs_order?.length ||
        Welcome.#welcome_imgs_order.length != Welcome.#NUM_OF_IMAGES
      ) {
        Welcome.#welcome_imgs_order = [];
        return await Welcome.getWelcomeImgsOrder();
      }
    }
  };

  static handleNewMember = async (member: GuildMember) => {
    const welcome_channel = ranni_guild?.channels?.welcome;

    if (!welcome_channel) return;

    let last_used_img = parseInt(
      (await welcome_channel.messages.fetch({ limit: 1 }))
        ?.at(0)
        ?.embeds.at(0)
        ?.image?.url.split(".")
        .at(-2)
        ?.split("/")
        .at(-1) ?? "0",
    );

    if (isNaN(last_used_img)) last_used_img = 0;

    if (!Welcome.#welcome_imgs_order) return;

    const new_img_idx =
      ((Welcome.#welcome_imgs_order?.indexOf(last_used_img) ?? -1) + 1) %
      Welcome.#welcome_imgs_order.length;

    if (new_img_idx == 0) await Welcome.getWelcomeImgsOrder();

    const img_filename = `${Welcome.#welcome_imgs_order[new_img_idx]}.jpg`;

    const img = new AttachmentBuilder(
      await fs.readFile(`./assets/welcome/${img_filename}`),
      {
        name: img_filename,
      },
    );

    await welcome_channel.send({
      content: userMention(member.id),
      embeds: [
        new CustomEmbed()
          .setTitle(`Welcome Comrade ${member.displayName}`)
          .setDescription(
            `\u200b\n<#1336326581915881593>\n- concerning topics\n<#1311105291890196620>\n- for stream schedule\n<#1311121252827664516>\n- for propaganda\n\n<a:evilcat:1432751141254467815> Enjoy your stay mf <a:evilcat:1432751141254467815>`,
          )
          .setThumbnail(member.user.avatarURL())
          .setImage(`attachment://${img_filename}`)
          .setColor(0xff1c37),
      ],
      files: [img],
    });
  };
}

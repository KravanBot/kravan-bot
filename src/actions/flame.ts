import {
  CacheType,
  ChatInputCommandInteraction,
  TextChannel,
  userMention,
} from "discord.js";
import { client } from "../index.js";
import { getRandomFromArray } from "../utils/helpers.js";

type InteractionT = ChatInputCommandInteraction<CacheType>;

export class Flame {
  static #FLAMING_CHANNEL_ID = "1386878625290256516";
  static #MESSAGES: {
    id: string;
    flames: string[];
  }[] = [
    {
      id: "1467257821484814398",
      flames: ["711280320066093077"],
    },
    {
      id: "1467257524288753766",
      flames: ["609097048662343700"],
    },
    {
      id: "1467107107932475456",
      flames: ["609097048662343700"],
    },
    {
      id: "1466892150703657013",
      flames: ["508655899309506570"],
    },
    {
      id: "1466892122333380851",
      flames: ["609097048662343700"],
    },
    {
      id: "1466465642713579798",
      flames: ["609097048662343700"],
    },
    {
      id: "1465101081297289299",
      flames: ["133282052350017536"],
    },
    {
      id: "1464582385382330429",
      flames: ["609097048662343700"],
    },
    {
      id: "1464262674522308827",
      flames: ["609097048662343700"],
    },
    {
      id: "1464189188932112509",
      flames: ["609097048662343700"],
    },
    {
      id: "1463990925637189685",
      flames: ["133282052350017536"],
    },
    {
      id: "1468254411385082070",
      flames: ["898439107959746580"],
    },
    {
      id: "1468254981047058504",
      flames: ["756137226202513449"],
    },
    {
      id: "1452699533891862632",
      flames: ["508655899309506570"],
    },
    {
      id: "1452001510329417828",
      flames: ["508655899309506570"],
    },
    {
      id: "1451990255908425921",
      flames: ["508655899309506570", "609097048662343700"],
    },
    {
      id: "1446249862629953799",
      flames: ["133282052350017536", "1234560476369780816"],
    },
    {
      id: "1468256788263604246",
      flames: ["508655899309506570"],
    },
    {
      id: "1468256884405305640",
      flames: ["609097048662343700"],
    },
    {
      id: "1439372723695517788",
      flames: ["508655899309506570"],
    },
    {
      id: "1439372740787179650",
      flames: ["508655899309506570"],
    },
    {
      id: "1438937358790692997",
      flames: ["508655899309506570"],
    },
    {
      id: "1468286930113401007",
      flames: ["609097048662343700"],
    },
    {
      id: "1468608053371998475",
      flames: ["508655899309506570"],
    },
    {
      id: "1468609465153749076",
      flames: ["133282052350017536"],
    },
    {
      id: "1468626429083259085",
      flames: ["508655899309506570"],
    },
    {
      id: "1468628285184544831",
      flames: ["898439107959746580"],
    },
    {
      id: "1468629015471456296",
      flames: ["609097048662343700"],
    },
    {
      id: "1468631990155612273",
      flames: ["1260205513795174434"],
    },
    {
      id: "1468633773137596416",
      flames: ["133282052350017536"],
    },
    {
      id: "1468633973684178996",
      flames: ["609097048662343700"],
    },
    {
      id: "1468634917289070918",
      flames: ["508655899309506570"],
    },
    {
      id: "1469072858549457062",
      flames: ["133282052350017536"],
    },
    {
      id: "1469039913776451867",
      flames: ["609097048662343700"],
    },
    {
      id: "1469719231565266945",
      flames: ["609097048662343700"],
    },
    {
      id: "1469699805482586112",
      flames: ["948255798134460426"],
    },
    {
      id: "1469418099278348328",
      flames: ["948255798134460426"],
    },
    {
      id: "1469107387762868250",
      flames: ["898439107959746580"],
    },
  ];

  #interaction: InteractionT;
  #flames: string | null;

  constructor(interaction: InteractionT) {
    this.#interaction = interaction;
    this.#flames = interaction.options.getUser("target", false)?.id ?? null;

    (async () => {
      await this.#sendRandomMessage();
    })();
  }

  async #sendRandomMessage() {
    const random = getRandomFromArray(
      this.#flames
        ? Flame.#MESSAGES.filter(({ flames }) => flames.includes(this.#flames!))
        : Flame.#MESSAGES,
    );

    if (!random)
      return await this.#interaction.reply(
        "Looks like they are clean... For now...",
      );

    const { id, flames } = random;

    const channel = (await client.channels.fetch(
      Flame.#FLAMING_CHANNEL_ID,
    )) as TextChannel;
    const message = await channel.messages.fetch(id);

    let flames_as_string = "";

    for (const flame of flames)
      flames_as_string +=
        (this.#interaction.guild?.members.cache.get(flame)?.displayName ??
          "Couldnt fetch the name but prob goobie") + ", ";

    const payload = {
      content: `${flames_as_string}wanna talk about it?`,
      embeds: [...message.embeds],
      files: [...message.attachments.values()],
    };

    await this.#interaction.reply(payload);
  }
}

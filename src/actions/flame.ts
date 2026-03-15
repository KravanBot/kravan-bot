import {
  ActionRowBuilder,
  Attachment,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Message,
  ModalSubmitInteraction,
  TextChannel,
  userMention,
} from "discord.js";
import { client } from "../index.js";
import { getRandomFromArray } from "../utils/helpers.js";
import { prisma } from "../db/prisma.js";
import { CustomEmbed } from "../utils/embed.js";
import { Canvas } from "@napi-rs/canvas";

type InteractionT = ChatInputCommandInteraction<CacheType>;

export class Flame {
  static FLAMING_CHANNEL_ID = "1386878625290256516";
  static LOG_CHANNEL_ID = "1476348164893053030";
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
    {
      id: "1475433958291542150",
      flames: ["508655899309506570"],
    },
    {
      id: "1474561830704775279",
      flames: ["133282052350017536"],
    },
    {
      id: "1474513074001023188",
      flames: ["898439107959746580"],
    },
    {
      id: "1474507629588910160",
      flames: ["609097048662343700"],
    },
    {
      id: "1474105278915149997",
      flames: ["898439107959746580"],
    },
    {
      id: "1473630154050895992",
      flames: ["508655899309506570"],
    },
    {
      id: "1473554763630252143",
      flames: ["898439107959746580"],
    },
    {
      id: "1473252048156753976",
      flames: ["508655899309506570"],
    },
    {
      id: "1470934284532453387",
      flames: ["508655899309506570"],
    },
    {
      id: "1470850218600693875",
      flames: ["609097048662343700"],
    },
    {
      id: "1470501134644019282",
      flames: ["609097048662343700"],
    },
    {
      id: "1470501134644019282",
      flames: ["609097048662343700"],
    },
    {
      id: "1476612399212658761",
      flames: ["454005992393539586"],
    },
    {
      id: "1476966223198814412",
      flames: ["1289239749583700113"],
    },
    {
      id: "1476967259070136362",
      flames: ["454005992393539586"],
    },
    {
      id: "1477673415962923129",
      flames: ["454005992393539586", "508655899309506570"],
    },
    {
      id: "1477674185387020348",
      flames: ["454005992393539586", "508655899309506570"],
    },
    {
      id: "1478028024007102475",
      flames: ["709841153763180545"],
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

  async #sendRandomMessage(): Promise<void> {
    if (!this.#interaction.replied) await this.#interaction.deferReply();

    const args = this.#flames
      ? {
          where: {
            flames: {
              has: this.#flames,
            },
          },
        }
      : {};

    const messages = [
      ...(this.#flames
        ? Flame.#MESSAGES.filter(({ flames }) => flames.includes(this.#flames!))
        : Flame.#MESSAGES),
      ...(await prisma.flame.findMany(args)),
    ];

    const random = getRandomFromArray(messages);

    if (!random) {
      await this.#interaction.editReply(
        "Looks like they are clean... For now...",
      );
      return;
    }

    const { id, flames } = random;

    let flames_as_string = "";

    for (const flame of flames)
      flames_as_string +=
        (this.#interaction.guild?.members.cache.get(flame)?.displayName ??
          "Couldnt fetch the name but prob goobie") + ", ";

    const channel = (await client.channels.fetch(
      Flame.FLAMING_CHANNEL_ID,
    )) as TextChannel;

    let message: Message<true>;

    try {
      message = await channel.messages.fetch(id);
    } catch (e) {
      await prisma.flame.delete({
        where: {
          id,
        },
      });

      return await this.#sendRandomMessage();
    }

    const payload = {
      content: `${flames_as_string}wanna talk about it?`,
      embeds: [...message.embeds],
      files: [...message.attachments.values()],
    };

    await this.#interaction.editReply(payload);
  }

  static sendFlameLog = async (
    flame: { username: string; content: string | Attachment[] },
    success: boolean,
    user_id: string,
  ) => {
    const channel = client.channels.cache.get(Flame.LOG_CHANNEL_ID);

    if (!channel || !channel.isSendable()) return;

    await channel.send({
      embeds: [
        new CustomEmbed()
          .setTitle("Flame Log")
          .setDescription(
            `Flame request was ${success ? "accepted" : "rejected"} by ${userMention(user_id)}!`,
          )
          .setFields([
            {
              name: "Username",
              value: flame.username,
            },
            {
              name: "Content",
              value:
                typeof flame.content == "string"
                  ? flame.content
                  : "(see attachments)",
            },
          ])
          .setColor(success ? "#6ade12" : "#e81c41"),
      ],
      files: typeof flame.content == "string" ? [] : flame.content,
    });
  };

  static sendFlameRequest = async (
    username: string,
    message: string | Attachment[],
  ) => {
    const CHANNEL_ID = "1476252282134986814";

    const channel = client.channels.cache.get(CHANNEL_ID) as TextChannel;

    if (!channel) return;

    channel.send({
      embeds: [
        new CustomEmbed()
          .setTitle("New Flame Request 🔥")
          .setFields([
            {
              name: "👤 Username",
              value: username,
            },
            {
              name: "💭 Content",
              value: typeof message == "string" ? message : "(see attachments)",
            },
          ])
          .setColor(0xff7417),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId("accept")
            .setLabel("✅ Accept")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("reject")
            .setLabel("❌ Reject")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
      files: typeof message == "string" ? [] : message,
    });
  };

  static acceptFlameRequest = async (
    getCanvas: () => Promise<Canvas>,
    interaction:
      | ButtonInteraction<CacheType>
      | ModalSubmitInteraction<CacheType>,
    username: string,
    content: string | Attachment[],
    flames_id: string,
  ) => {
    let canvas: Canvas | null = null;

    if (typeof content == "string") canvas = await getCanvas();

    interaction.reply({
      content: "✅ Flame request accepted!",
      ephemeral: true,
    });

    await interaction.message?.delete();

    const channel = client.channels.cache.get(Flame.FLAMING_CHANNEL_ID);

    if (!channel || !channel.isSendable()) return;

    const msg = await channel.send({
      files: canvas
        ? [
            new AttachmentBuilder(canvas.toBuffer("image/png"), {
              name: "flame.png",
            }),
          ]
        : (content as Attachment[]),
    });

    await Flame.sendFlameLog(
      {
        username,
        content,
      },
      true,
      interaction.user.id,
    );

    await prisma.flame.create({
      data: {
        id: msg.id,
        flames: [flames_id],
      },
    });
  };
}

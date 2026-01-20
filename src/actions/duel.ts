import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  InteractionCallbackResponse,
  Message,
  TextChannel,
  User,
  userMention,
} from "discord.js";
import {
  addCoins,
  getUserCoins,
  hasEnoughCoins,
  isInJail,
  takeCoins,
} from "../db/prisma.js";
import { client } from "../index.js";
import { CustomEmbed } from "../utils/embed.js";

export class Duel {
  static OPTIONS = {
    rock: { name: "rock_sus", id: "1457135727732199666" },
    paper: { name: "paperbonkthecar", id: "1457136610041790565" },
    scissors: { name: "minecraftsword", id: "1457139409303503085" },
  };

  #interaction: ChatInputCommandInteraction<CacheType>;
  #initiator: User;
  #target: User;
  #bet: number;

  constructor(interaction: ChatInputCommandInteraction<CacheType>) {
    const initiator = interaction.user;
    const target = interaction.options.getUser("target", true);
    const bet = interaction.options.getNumber("bet", true);

    this.#interaction = interaction;
    this.#initiator = initiator;
    this.#target = target;
    this.#bet = bet;

    (async () => {
      if (!(await this.#checkInteraction())) return;

      const invitation = await this.#sendInvitation();
      await this.#checkInvitationResponse(invitation);
    })();
  }

  async #sendInvitation() {
    return await this.#interaction.reply({
      content: `OOO ${userMention(this.#initiator.id)} invited ${userMention(
        this.#target.id,
      )} to a duel on ${this.#bet.toLocaleString()} coins 🪙.\n${
        this.#target.username
      } has 1 minute to respond.\n\n`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("accept")
            .setLabel("LETS RUN IT MF")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("deny")
            .setLabel("ME SCARED")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
      withResponse: true,
    });
  }

  async #checkInvitationResponse(
    invitation: InteractionCallbackResponse<boolean>,
  ) {
    try {
      const confirmation =
        await invitation.resource?.message?.awaitMessageComponent({
          filter: (i) => i.user.id === this.#target.id,
          time: 60_000,
        });

      if (!(await hasEnoughCoins(this.#target.id, this.#bet)))
        return await this.#interaction.editReply({
          content: `${userMention(this.#target.id)} DOES NOT HAVE ENOUGH COINS`,
          components: [],
        });

      if (confirmation?.customId != "accept")
        return await this.#interaction.editReply({
          content: `${userMention(this.#target.id)} IS A SCARED MF`,
          components: [],
        });

      const channel = client.channels.cache.get(
        this.#interaction.channelId,
      ) as TextChannel;
      await this.#interaction.deleteReply();

      await this.#createDuel(channel);
    } catch (e) {
      await this.#interaction.editReply({
        content: `${userMention(this.#initiator.id)} invited ${userMention(
          this.#target.id,
        )} to a duel on ${this.#bet.toLocaleString()} coins 🪙, but ${
          this.#target.displayName
        } went pooping or sum (be careful not to smash ur head against the toilet)`,
        components: [],
      });
    }
  }

  async #createDuel(channel: TextChannel, is_rematch: boolean = false) {
    const pool = this.#bet * 2;

    const game_msg = await this.#sendGameMessage(channel, is_rematch);

    try {
      const answers = await this.#getPlayersAnswers(game_msg);
      const winner = this.#duelResult(answers);

      if (!winner) {
        await game_msg.delete();
        await this.#createDuel(channel, true);

        return;
      }

      const loser =
        winner == this.#initiator.id ? this.#target.id : this.#initiator.id;

      await addCoins(winner, this.#bet);
      await takeCoins(loser, this.#bet);

      await game_msg.edit({
        content: `WOW SO MUCH TENSION!!\n\n${Array.from(answers.entries())
          .map(([answer, user_id]) => {
            const selected_option = Duel.OPTIONS[answer];

            return `${userMention(user_id)} chose: <a:${selected_option.name}:${
              selected_option.id
            }>`;
          })
          .join("\n")}\n\n${userMention(
          winner,
        )} WON ${pool.toLocaleString()} coins WITHOUT ANY ISSUES 🥳🎊!!!`,
        embeds: [],
        components: [],
      });
    } catch (e) {
      await game_msg.edit({
        content: `Looks like ${userMention(
          e as string,
        )} is SLEEPING rn 😴\nCoins were readded to the participants.`,
        embeds: [],
        components: [],
      });
    }
  }

  async #sendGameMessage(channel: TextChannel, is_rematch: boolean) {
    return await channel.send({
      embeds: [
        new CustomEmbed()
          .setTitle(
            is_rematch
              ? "DRAW! FIGHT CONTINUES 🥊"
              : "LET THE FIGHTING BEGIN 🥊",
          )
          .setDescription(
            `You have 1 minute to lock in your answer\n\n${userMention(
              this.#initiator.id,
            )} VS ${userMention(this.#target.id)}\nPRICE POOL: ${(
              this.#bet * 2
            ).toLocaleString()} coins 🪙`,
          )
          .setColor(0xff4242)
          .setImage(
            "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnA0ajJuODJ0N244NWxibjE1N3I3bGl2NWkxcTliMm55dHM5ZnRqdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/B52HxLPfFwt8Gdacat/giphy.gif",
          )
          .setThumbnail(
            "https://images-ext-1.discordapp.net/external/AQNkEjhlEl3gQDkdIKutRJyxyKEWIvOCZtNwrkQVWD0/%3Fsize%3D48%26animated%3Dtrue%26name%3D8345cwin/https/cdn.discordapp.com/emojis/1457139340797935738.gif?width=53&height=53",
          ),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          Object.entries(Duel.OPTIONS).map(([id, icon]) =>
            new ButtonBuilder()
              .setCustomId(id)
              .setEmoji({
                id: icon.id,
              })
              .setStyle(ButtonStyle.Secondary),
          ),
        ),
      ],
    });
  }

  async #getPlayersAnswers(game_msg: Message<true>) {
    const answers = new Map<keyof typeof Duel.OPTIONS, string>();

    return await new Promise<typeof answers>((res, rej) => {
      for (const id of [this.#initiator.id, this.#target.id]) {
        game_msg
          .awaitMessageComponent({
            filter: (i) => i.user.id === id,
            time: 60_000,
          })
          .then(async (answer) => {
            const answer_id = answer.customId as keyof typeof Duel.OPTIONS;

            const is_first = answers.size <= 0;

            answers.set(answer_id, id);

            await answer.deferUpdate();

            if (!is_first) return res(answers);
          })
          .catch(() => {
            return rej(id);
          });
      }
    });
  }

  #duelResult(answers: Map<keyof typeof Duel.OPTIONS, string>): string {
    if (answers.size !== 2) return "";

    const entries = Array.from(answers.entries());

    const [choice1, player1] = entries[0]!;
    const [choice2, player2] = entries[1]!;

    if (choice1 === choice2) return "draw";

    const wins_against: Record<
      keyof typeof Duel.OPTIONS,
      keyof typeof Duel.OPTIONS
    > = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };

    return wins_against[choice1] === choice2 ? player1 : player2;
  }

  async #checkInteraction() {
    if (this.#initiator.id == this.#target.id) {
      await this.#interaction.reply("WDYM U WANT TO CHALLENGE URSELF DUMMY");
      return false;
    }

    if (!(await hasEnoughCoins(this.#initiator.id, this.#bet))) {
      await this.#interaction.reply("U CANT AFFORD THIS BET");
      return false;
    }

    if (!(await hasEnoughCoins(this.#target.id, this.#bet))) {
      await this.#interaction.reply("TARGET CANT AFFORD THIS BET");
      return false;
    }

    if (await isInJail(this.#target.id)) {
      await this.#interaction.reply("TARGET IS IN JAIL");
      return false;
    }

    return true;
  }
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { words } from "../utils/constants.js";
import { getRandomFromArray } from "../utils/helpers.js";
import { CustomEmbed } from "../utils/embed.js";
import { addCoins } from "../db/prisma.js";

enum ResultE {
  WRONG,
  MISPLACED,
  RIGHT,
}

export class Wordle {
  static #NUM_OF_GUESSES = 6;

  #word: string;
  #guesses: { word: string; result: ResultE[] }[];

  constructor(private interaction: ChatInputCommandInteraction<CacheType>) {
    this.#word = getRandomFromArray(words)!.toLowerCase();
    this.#guesses = [];

    (async () => {
      await interaction.deferReply();

      await this.#takeGuesses();
    })();
  }

  async #takeGuesses() {
    for (let i = 0; i < Wordle.#NUM_OF_GUESSES + 1; i++) {
      const guessed_correctly = this.#guesses.at(-1)?.word === this.#word;

      const game_finished = i >= Wordle.#NUM_OF_GUESSES || guessed_correctly;

      const msg = await this.interaction.editReply({
        embeds: [
          new CustomEmbed().setDescription(
            new Array(Wordle.#NUM_OF_GUESSES)
              .fill(0)
              .map((_, idx) => {
                const { word, result } = this.#guesses.at(idx) ?? {
                  word: "",
                  result: new Array(5).fill(ResultE.WRONG),
                };

                return `${result.map((item) => (item == ResultE.WRONG ? "⬛" : item == ResultE.MISPLACED ? "🟨" : "🟩")).join("")}\` | ${word.toUpperCase() || "_____"}\``;
              })
              .join("\n"),
          ),
        ],
        components: game_finished
          ? []
          : [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId("wordle-guess")
                  .setLabel("❓ Guess")
                  .setStyle(ButtonStyle.Secondary),
              ),
            ],
      });

      if (game_finished) {
        if (guessed_correctly) await addCoins(this.interaction.user.id, 1_000);

        break;
      }

      const collector = msg.createMessageComponentCollector({
        time: 300_000,
        max: 1,
        filter: (interaction) =>
          interaction.user.id == this.interaction.user.id,
      });

      try {
        const guess = (
          await new Promise<string>((res, rej) => {
            collector.on("collect", async (interaction) => {
              await interaction.deferUpdate();

              const modal = new ModalBuilder()
                .setCustomId(`wordle_${interaction.id}_${i}`)
                .setTitle("Wordle");

              const guess_input = new TextInputBuilder()
                .setCustomId("guess_field")
                .setLabel("Whats your guess?")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. Ranni")
                .setMinLength(5)
                .setMaxLength(5)
                .setRequired(true);

              modal.addComponents(guess_input);

              await interaction.showModal(modal);

              try {
                const submission = await interaction.awaitModalSubmit({
                  filter: (int) =>
                    int.customId === `wordle_${interaction.id}_${i}` &&
                    int.user.id === interaction.user.id,
                  time: 300_000,
                });

                const guess =
                  submission.fields.getTextInputValue("guess_field");

                await submission.deferUpdate();

                collector.stop("guessed");

                return res(guess);
              } catch {
                return rej();
              }
            });

            collector.on("end", (_, reason) => {
              if (reason === "time") return rej();
            });
          })
        ).toLowerCase();

        this.#guesses.push({
          word: guess,
          result: this.#getGuessResults(guess),
        });
      } catch (e) {
        console.log(e);

        break;
      }
    }

    await this.interaction.editReply({
      content: `The word was: ${this.#word}`,
      components: [],
    });
  }

  #getGuessResults(guess: string) {
    const word = this.#word;
    const result = new Array<ResultE>(word.length).fill(ResultE.WRONG);
    const letter_counts = new Map<string, number>();

    for (let i = 0; i < word.length; i++) {
      const word_letter = word[i]!;
      if (guess[i] === word_letter) {
        result[i] = ResultE.RIGHT;
      } else {
        letter_counts.set(
          word_letter,
          (letter_counts.get(word_letter) ?? 0) + 1,
        );
      }
    }

    for (let i = 0; i < guess.length; i++) {
      if (result[i] === ResultE.RIGHT) continue;

      const guess_letter = guess[i]!;
      const count = letter_counts.get(guess_letter) ?? 0;

      if (count > 0) {
        result[i] = ResultE.MISPLACED;
        letter_counts.set(guess_letter, count - 1);
      }
    }

    return result;
  }
}

// import { SlashCommandBuilder } from "discord.js";

declare module "@zuzak/owo" {
  interface T {
    (word: string): string;
  }

  const owo: Owo;
  export = owo;
}

type EmotesNActionsT = Record<
  string,
  {
    urls: string[];
    titles: string[];
  }
>;

type QuestT = Partial<{
  donate: number;
  meme: number;
  meal: number;
  pet: number;
  gamble: number;
  quote: number;
  highlight: number;
  cringe_name: number;
  art: number;
  song: number;
  count: number;
}>;

type QuestMissionsT = Exclude<keyof QuestT, "of">;

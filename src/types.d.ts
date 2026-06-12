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

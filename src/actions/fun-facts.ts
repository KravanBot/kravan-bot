import { type Express, type Request, type Response } from "express";
import { prisma } from "../db/prisma.js";
import { GoogleGenAI } from "@google/genai";

export class FunFacts {
  static #CATEGORIES = [
    "Animals",
    "Planets",
    "Nature",
    "Food & Drink",
    "Geography",
    "Arts, Music & Entertainment",
    "Gaming",
  ] as const;
  static #THEMES = [
    // Animals
    "pistol shrimp and their snapping claws",
    "tardigrades and how they survive extreme conditions",
    "octopus intelligence and behavior",
    "migration of Arctic terns",
    "bioluminescent deep-sea creatures",
    "how bats navigate and live",
    "the social lives of crows and ravens",
    "mantis shrimp vision and punches",
    "animal camouflage and mimicry",
    "venomous animals and how venom works",
    "ants and their colony behavior",
    "bees and honey production",
    "the strange biology of sloths",
    "elephant memory and communication",
    "jellyfish that seem immortal",
    "extinct megafauna of the Ice Age",
    "dinosaur discoveries and misconceptions",
    "birds with unusual mating displays",
    "animal sleep habits",
    "how cats and dogs perceive the world",
    "whale songs and whale migration",
    "unusual animal parenting strategies",
    "insects that do surprising things",
    "venomous and poisonous frogs",

    // Nature
    "volcanoes and famous eruptions",
    "earthquakes and tectonic plates",
    "the deepest parts of the ocean",
    "the Amazon rainforest",
    "glaciers and ice ages",
    "caves and underground ecosystems",
    "lightning and thunderstorms",
    "deserts and how life survives in them",
    "tornadoes and hurricanes",
    "unusual rock formations and minerals",
    "coral reefs and their ecosystems",
    "the northern lights",
    "trees, forests, and how trees communicate",
    "rivers, lakes, and waterfalls",
    "islands with unusual features",
    "weather records and extreme climates",
    "fossils and how they form",

    // Food & drink
    "chocolate and cocoa history",
    "coffee and tea origins",
    "spices and the spice trade",
    "the history of pizza and pasta",
    "fermented foods around the world",
    "the science of cooking",
    "unusual fruits and vegetables",
    "cheese varieties and cheese making",
    "street food around the world",
    "the history of bread",
    "the origins of famous dishes",
    "sugar, candy, and sweets history",

    // Geography
    "unusual national flags and symbols",
    "tiny countries and micronations",
    "ancient cities and ruins",
    "world records and extreme places",
    "traditional festivals around the world",
    "unique languages and writing systems",
    "famous bridges and tunnels",
    "the world's tallest buildings",
    "Japan's culture and quirks",
    "Scandinavian traditions",
    "customs and etiquette around the world",
    "the history of money and currencies",
    "cities built in unusual places",
    "ancient wonders of the world",

    // Arts, music & entertainment
    "the history of music instruments",
    "famous painters and their techniques",
    "the origins of classical music composers",
    "the history of cinema and special effects",
    "the history of comic books and animation",
    "the origin of famous board games",
    "magic tricks and the history of illusions",
    "architecture styles and famous architects",
    "the history of theater",
    "famous authors and their writing habits",
    "mythology of the Greeks, Norse, and Egyptians",
    "folklore and legends around the world",

    // Planets
    "Mercury and its extreme temperatures",
    "Venus and its crushing atmosphere",
    "Mars and its giant volcanoes and canyons",
    "Jupiter's Great Red Spot and its moons",
    "Saturn's rings and the moon Titan",
    "Uranus and its sideways rotation",
    "Neptune and its supersonic winds",
    "Pluto and the dwarf planet debate",
    "the moons of our solar system",
    "how the planets formed",
    "exoplanets with strange conditions",
    "the history of discovering the planets",

    // Gaming
    "the history of arcade games",
    "the golden age of classic consoles",
    "the origins of famous video game characters",
    "unusual and legendary video game glitches",
    "the history of esports and competitive gaming",
    "the evolution of video game music",
    "famous video game development stories",
    "speedrunning records and tricks",
    "the history of PC gaming and modding",
    "video game easter eggs and hidden secrets",
    "the rise of indie games",
    "the history of mobile gaming",
  ];

  #ai: GoogleGenAI;

  constructor(app: Express) {
    this.#ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    app.get("/facts", async (req: Request, res: Response) => {
      res.send(await prisma.fact.findMany());

      this.#writeNewFacts();
    });

    this.#writeNewFacts();
  }

  async #writeNewFacts() {
    const themes = this.#pickRandomThemes(20);

    try {
      const response = await this.#ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
        contents: `Give 5 very simple (like telling to a child) surprising, verified-true short fun facts (up to 15 words) for each of these themes: ${themes.join("; ")}, so in total, i expect 100 facts. For each fact, set "category" to the general category it fits best. Make the facts sound like a human telling another human a spontanious fun fact they just remembered. Dont use very high vocabulary, make it casual and fun. Dont use exact years/dates, you can replace those with time spans (30 years ago for example) or centuries. Dont give facts that need context/further explanation, if it needs context/further explanation, dont say it at all (for example, ). if talking about a name/specie, dont give the actual name that can be long or complicated, you can just say generally what it is (for example, dont say "Aurelia aurita", say moon jellyfish)`,
        config: {
          temperature: 1.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                category: {
                  type: "string",
                  format: "enum",
                  enum: [...FunFacts.#CATEGORIES],
                },
              },
              required: ["text", "category"],
            },
          },
        },
      });

      const new_facts = JSON.parse(response.text ?? "[]");

      if (!new_facts.length) return;

      await prisma.fact.deleteMany();
      return await prisma.fact.createManyAndReturn({
        data: new_facts,
      });
    } catch (e) {
      console.log(e);
    }
  }

  #pickRandomThemes(n: number): string[] {
    return [...FunFacts.#THEMES].sort(() => Math.random() - 0.5).slice(0, n);
  }
}

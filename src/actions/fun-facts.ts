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

    // Space & astronomy
    "black holes and event horizons",
    "the Voyager space probes",
    "the Moon and lunar landings",
    "Mars rovers and exploration",
    "the planet Venus and its harsh conditions",
    "Saturn's rings and moons",
    "neutron stars and pulsars",
    "the Tunguska event and asteroid impacts",
    "the International Space Station",
    "exoplanets and the search for life",
    "the Big Bang and cosmic background radiation",
    "comets and their tails",
    "the Sun and solar flares",
    "dark matter and dark energy",
    "famous astronomers and their discoveries",
    "life of astronauts in microgravity",

    // Human body & medicine
    "the human brain and memory",
    "how sleep and dreams work",
    "the gut microbiome",
    "the history of vaccines",
    "the five senses and how they trick us",
    "famous accidental medical discoveries",
    "the immune system",
    "human reflexes and the nervous system",
    "the heart and blood circulation",
    "DNA and genetics",
    "optical illusions and visual perception",
    "the strange history of medicine",
    "the skin and its functions",
    "human bones and muscles",

    // Earth science & nature
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

    // History
    "Ancient Egypt and daily life of its people",
    "the Roman Empire and its engineering",
    "Viking exploration and culture",
    "the Byzantine Empire",
    "medieval castles and knights",
    "the Silk Road and ancient trade",
    "the Renaissance and its inventors",
    "the Industrial Revolution",
    "ancient Greek philosophers and inventions",
    "the Mongol Empire",
    "pirates and the Golden Age of Piracy",
    "famous shipwrecks and lost treasure",
    "the Library of Alexandria and ancient libraries",
    "samurai and feudal Japan",
    "ancient Mesopotamia and early writing",
    "the Aztec and Maya civilizations",
    "the Inca Empire",
    "historical hoaxes and mysteries",
    "unusual laws throughout history",
    "ancient and medieval weapons and tools",
    "the history of everyday objects",
    "the Cold War and the Space Race",
    "history of the Olympic Games",
    "Ottoman Empire culture and history",

    // Science & technology
    "the periodic table and element discoveries",
    "quantum physics oddities",
    "the history of electricity",
    "famous scientific accidents and discoveries",
    "the invention of the internet",
    "the history of computers",
    "artificial intelligence milestones",
    "how GPS and satellites work",
    "famous inventors and their rivalries",
    "robotics and automation",
    "materials science and strange materials",
    "chemistry of everyday life",
    "the speed of light and relativity",
    "nuclear power and radiation",
    "the history of photography and film",
    "famous unsolved science problems",
    "the history of video games",
    "programming languages and their origins",

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

    // Geography & cultures
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

    // Math, language & the mind
    "famous mathematicians and their puzzles",
    "prime numbers and mathematical curiosities",
    "the origin of words and idioms",
    "unusual words from other languages",
    "psychology experiments and what they showed",
    "logical paradoxes and brain teasers",
    "the history of numbers and counting",
    "cognitive biases and mental shortcuts",

    // Sports & misc
    "strange sports from around the world",
    "records set by athletes",
    "the history of the Olympics' unusual events",
    "the physics of sports",
    "the history of transportation",
    "famous trains, ships, and aircraft",
    "the history of clothing and fashion",
    "the history of toys and games",
    "unusual jobs throughout history",
    "inventions that failed spectacularly",
    "the science of colors",
    "the history of timekeeping and calendars",
  ];

  #ai: GoogleGenAI;

  constructor(app: Express) {
    this.#ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    app.get("/facts", async (req: Request, res: Response) => {
      res.send(await prisma.fact.findMany());

      this.#writeNewFacts();
    });
  }

  async #writeNewFacts() {
    const themes = this.#pickRandomThemes(20);

    try {
      const response = await this.#ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
        contents: `Give 5 very simple (like telling to a child) surprising, verified-true short fun facts (up to 20 words) for each of these themes: ${themes.join("; ")}. For each fact, set "category" to the general category it fits best. Make the facts sound like a human telling another human a spontanious fun fact they just remembered. Dont use very high vocabulary, make it casual and fun. Dont use exact years/dates, you can replace those with time spans (30 years ago for example) or centuries. Dont give facts that need context/further explanation. if talking about a name/specie, dont give the actual name that can be long or complicated, you can just say generally what it is (for example, dont say "Aurelia aurita", say moon jellyfish)`,
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
      await prisma.fact.createMany({
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

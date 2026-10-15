import express, { type Request, type Response } from "express";
import cors from "cors";
import { prisma } from "../db/prisma.js";

export class FunFacts {
  constructor() {
    const app = express();
    app.use(cors());
    const PORT = 15241;

    app.get("/", async (req: Request, res: Response) => {
      res.send(await prisma.fact.findMany());
    });

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  }
}

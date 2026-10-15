import express, { type Request, type Response } from "express";
import cors from "cors";
import { prisma } from "../db/prisma.js";

export class FunFacts {
  constructor() {
    const app = express();
    app.use(cors());

    app.get("/", async (req: Request, res: Response) => {
      res.send(await prisma.fact.findMany());
    });

    app.listen(parseInt(process.env.PORT!), "0.0.0.0", () => {
      console.log(`Server is running at http://localhost:${process.env.PORT}`);
    });
  }
}

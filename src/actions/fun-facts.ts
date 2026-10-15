import { type Express, type Request, type Response } from "express";
import { prisma } from "../db/prisma.js";

export class FunFacts {
  constructor(app: Express) {
    app.get("/facts", async (req: Request, res: Response) => {
      res.send(await prisma.fact.findMany());
    });
  }
}

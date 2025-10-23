import { json, urlencoded } from "body-parser";
import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import { submitBallotOptimized } from "./submitBallotOptimised";
import apiRouter from "./routes/api";
import resultsRouter from "./routes/results";
import authRouter from "./routes/auth";
import adminCrudRouter from "./routes/adminCrud";
import adminRouter from "./routes/admin";

export const createServer = (): Express => {
  const app = express();
  
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(cors({
      origin: '*',
      credentials: false,
    }))
    .get("/message/:name", (req, res) => {
      return res.json({ message: `hello ${req.params.name}` });
    })
    .get("/status", (_, res) => {
      return res.json({ ok: true });
    });
    app.get("/", (_, res) => {
      return res.json({ ok: true });
    });

  // API Routes
  app.use("/api", apiRouter);
  app.use("/api", resultsRouter);
  app.use("/api", authRouter);
  app.use("/api", adminCrudRouter);
  app.use("/api", adminRouter);

  // Submit ballot endpoint
  app.post("/api/submit-ballot", async (req, res) => {
    try {
      const { electionId, token, rankings, meta } = req.body;
      if (!electionId || !token || !rankings) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const result = await submitBallotOptimized(electionId, token, rankings, meta);
      res.json(result);
    } catch (err: any) {
      console.error("submit-ballot error:", err);
      res.status(400).json({ error: err.message || "Failed to submit ballot" });
    }
  });

  return app;
};

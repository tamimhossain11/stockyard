// db.js loads .env, so import it before anything reads process.env.
import prisma from "./db.js";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Open this in a browser to check a deploy: it also confirms the database answers.
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

// Render sets PORT; 4000 is the local fallback.
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

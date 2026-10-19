// db.js loads .env, so import it before anything reads process.env.
import prisma from "./db.js";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import forecastRoutes from "./routes/forecast.js";
import { errorHandler } from "./middleware/errorHandler.js";

// The app is built here and started in index.js, so tests can import it
// without opening a port.
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/forecast", forecastRoutes);

// Open this in a browser to check a deploy: it also confirms the database answers.
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Last, so it catches errors from every route above.
app.use(errorHandler);

export default app;

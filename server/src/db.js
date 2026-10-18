// Load .env before the client is created, so DATABASE_URL is set.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// One shared client for the whole app. Every route imports this instance;
// creating a client per request would open too many database connections.
const prisma = new PrismaClient();

export default prisma;

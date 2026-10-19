import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/httpError.js";

// Express 5 sends errors thrown in async routes here. Four arguments is how
// Express recognises an error handler, so `next` stays even though it's unused.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  // express.json() could not read the body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON" });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return res.status(404).json({ message: "Not found" });
    if (err.code === "P2002") return res.status(409).json({ message: "That already exists" });
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
}

import { z } from "zod";
import { HttpError } from "./httpError.js";

// Same idea as the safeParse in auth.js, shared by every route:
// valid input comes back as data, invalid input becomes a 400.
export function parse(schema, input) {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".");
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue.message);
  }

  return result.data;
}

// Route ids arrive as strings ("12"), so coerce them to a whole number.
export const idParam = z.coerce
  .number({ error: "id must be a number" })
  .int("id must be a whole number")
  .positive("id must be positive");

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import prisma from "../src/db.js";

// These requests are all rejected before any database query, so no database is needed.
let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await prisma.$disconnect();
});

test("protected routes return 401 without a token", async () => {
  for (const path of ["/api/auth/me", "/api/products", "/api/orders", "/api/forecast"]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 401, path);
    assert.deepEqual(await res.json(), { message: "Login required" });
  }
});

test("a made-up token is rejected with 401", async () => {
  const res = await fetch(`${base}/api/products`, {
    headers: { Authorization: "Bearer not.a.real.token" },
  });

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { message: "Invalid or expired token" });
});

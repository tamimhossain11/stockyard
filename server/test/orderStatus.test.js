import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDER_STATUSES, canMove, nextStatuses, stockChange } from "../src/lib/orderStatus.js";

const allowed = [
  ["PENDING", "CONFIRMED"],
  ["PENDING", "CANCELLED"],
  ["CONFIRMED", "DELIVERED"],
  ["CONFIRMED", "CANCELLED"],
];

test("allows exactly the four moves in the status flow", () => {
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      const expected = allowed.some(([f, t]) => f === from && t === to);
      assert.equal(canMove(from, to), expected, `${from} -> ${to}`);
    }
  }
});

test("delivered and cancelled are final", () => {
  assert.deepEqual(nextStatuses("DELIVERED"), []);
  assert.deepEqual(nextStatuses("CANCELLED"), []);
});

test("skipping a step is not allowed", () => {
  assert.equal(canMove("PENDING", "DELIVERED"), false);
});

test("unknown statuses can't move anywhere", () => {
  assert.equal(canMove("SHIPPED", "DELIVERED"), false);
  assert.equal(canMove("PENDING", "SHIPPED"), false);
  assert.deepEqual(nextStatuses(undefined), []);
});

test("confirming deducts stock", () => {
  assert.equal(stockChange("PENDING", "CONFIRMED"), "deduct");
});

test("cancelling a confirmed order restores stock", () => {
  assert.equal(stockChange("CONFIRMED", "CANCELLED"), "restore");
});

test("cancelling a pending order and delivering leave stock alone", () => {
  assert.equal(stockChange("PENDING", "CANCELLED"), "none");
  assert.equal(stockChange("CONFIRMED", "DELIVERED"), "none");
});

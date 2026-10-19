
export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"];

const ALLOWED_MOVES = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function nextStatuses(from) {
  return ALLOWED_MOVES[from] ?? [];
}

export function canMove(from, to) {
  return nextStatuses(from).includes(to);
}

export function stockChange(from, to) {
  if (to === "CONFIRMED") return "deduct";
  if (from === "CONFIRMED" && to === "CANCELLED") return "restore";
  return "none";
}

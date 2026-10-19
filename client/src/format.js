// en-IN groups digits the way Bangladesh does: 1,00,000.
const number = (value, digits) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });

export const money = (value) => `৳${number(value, 2)}`;

export const quantity = (value, unit) => `${number(value, 3)} ${unit}`;

export const dateTime = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const productName = (p) => `${p.title} ${p.variant}`;

export const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};


export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const AVERAGE_WEEKS = 4;
export const COVER_WEEKS = 2; 

// Monday 00:00 UTC of the week that contains `date`.
export function startOfWeek(date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - daysSinceMonday);
  return day;
}


export function weeklyTotals(sales, weeks, now = new Date()) {
  const end = startOfWeek(now).getTime();
  const start = end - weeks * WEEK_MS;
  const totals = new Map();

  for (const { productId, quantity, createdAt } of sales) {
    const time = createdAt.getTime();
    if (time < start || time >= end) continue;

    if (!totals.has(productId)) totals.set(productId, new Array(weeks).fill(0));
    const week = Math.floor((time - start) / WEEK_MS);
    totals.get(productId)[week] += quantity;
  }

  return totals;
}

// The Monday each of those weeks starts on, oldest first (for table headings).
export function weekStarts(weeks, now = new Date()) {
  const end = startOfWeek(now).getTime();
  return Array.from({ length: weeks }, (_, i) => new Date(end - (weeks - i) * WEEK_MS));
}

export function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function forecastNextWeek(series) {
  return average(series.slice(-AVERAGE_WEEKS));
}

// How much to buy so stock covers COVER_WEEKS of forecast demand. 0 when stock is enough.
export function reorderAmount(forecast, stock) {
  const target = forecast * COVER_WEEKS;
  return stock < target ? target - stock : 0;
}

export function backtest(series, hidden = 4) {
  const known = series.slice(0, -hidden);
  const actual = series.slice(-hidden);
  const model = forecastNextWeek(known);
  const naive = known.at(-1) ?? 0;

  const sumAbs = (guess) => actual.reduce((sum, a) => sum + Math.abs(a - guess), 0);

  return {
    actual,
    model,
    naive,
    modelError: sumAbs(model),
    naiveError: sumAbs(naive),
    actualTotal: actual.reduce((sum, a) => sum + a, 0),
  };
}

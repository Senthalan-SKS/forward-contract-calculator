// ---------------------------------------------------------------------------
// Market data — live (Frankfurter API for FX) + realistic simulated data
// for commodities. No API key required.
// ---------------------------------------------------------------------------

export type MarketId = "wheat" | "oil" | "currency";

export interface PricePoint {
  date: string;   // YYYY-MM-DD
  price: number;
  open?: number;
  high?: number;
  low?: number;
}

export interface MarketData {
  id: MarketId;
  name: string;
  ticker: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  unit: string;
  history: PricePoint[]; // oldest first, up to 10 trading days
  source: "live" | "simulated";
  asOf: string;
}

// ─── Scenario → Market mapping ───────────────────────────────────────────────
export const SCENARIO_MARKET_MAP: Partial<Record<string, MarketId>> = {
  wheat: "wheat",
  oil: "oil",
  currency: "currency",
};

// ─── Market configuration ────────────────────────────────────────────────────
interface MarketConfig {
  name: string;
  ticker: string;
  basePrice: number;
  unit: string;
  dailyVol: number; // daily volatility as fraction of price
  ohlcSpread: number; // intraday spread as fraction of price
}

const CONFIGS: Record<MarketId, MarketConfig> = {
  wheat: {
    name: "Wheat (CBOT)",
    ticker: "ZW=F",
    basePrice: 0.52,
    unit: "USD per kg",
    dailyVol: 0.014,
    ohlcSpread: 0.008,
  },
  oil: {
    name: "Crude Oil WTI",
    ticker: "CL=F",
    basePrice: 76.4,
    unit: "USD per barrel",
    dailyVol: 0.017,
    ohlcSpread: 0.012,
  },
  currency: {
    name: "GBP / USD",
    ticker: "GBP/USD",
    basePrice: 1.265,
    unit: "USD per GBP",
    dailyVol: 0.004,
    ohlcSpread: 0.002,
  },
};

// ─── Seeded pseudo-random (LCG) ──────────────────────────────────────────────
function seededRandom(seed: number): number {
  let s = ((seed % 2147483647) + 2147483647) % 2147483647;
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
}

function dateSeed(dateStr: string, salt: number): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return y * 100000 + m * 1000 + d * 10 + Math.round(salt * 100);
}

// ─── Simulated history ───────────────────────────────────────────────────────
export function generateSimulatedHistory(id: MarketId, days = 10): PricePoint[] {
  const cfg = CONFIGS[id];
  const today = new Date();
  const points: PricePoint[] = [];
  let price = cfg.basePrice;

  // Walk backwards, then push in ascending date order
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  for (const dateStr of dates) {
    const seed = dateSeed(dateStr, cfg.basePrice);
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1);
    const r3 = seededRandom(seed + 2);
    const r4 = seededRandom(seed + 3);

    // Mean-reverting random walk
    const drift = (cfg.basePrice - price) * 0.08;
    const shock = (r1 - 0.5) * 2 * cfg.dailyVol * cfg.basePrice;
    price = Math.max(cfg.basePrice * 0.82, Math.min(cfg.basePrice * 1.18, price + drift + shock));

    const spread = cfg.ohlcSpread * price;
    const open  = +(price + (r2 - 0.5) * spread).toFixed(4);
    const high  = +(Math.max(open, price) + r3 * spread * 0.6).toFixed(4);
    const low   = +(Math.min(open, price) - r4 * spread * 0.6).toFixed(4);

    points.push({ date: dateStr, price: +price.toFixed(4), open, high, low });
  }
  return points;
}

// ─── Live currency data via Frankfurter API (no key, CORS-safe) ──────────────
async function fetchLiveCurrency(): Promise<MarketData | null> {
  try {
    const today = new Date();
    const from  = new Date(today);
    from.setDate(from.getDate() - 10); // fetch last 10 days

    const toStr   = today.toISOString().split("T")[0];
    const fromStr = from.toISOString().split("T")[0];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const [latestRes, histRes] = await Promise.all([
      fetch("https://api.frankfurter.app/latest?from=GBP&to=USD", { signal: controller.signal }),
      fetch(`https://api.frankfurter.app/${fromStr}..${toStr}?from=GBP&to=USD`, { signal: controller.signal }),
    ]);
    clearTimeout(timer);

    if (!latestRes.ok || !histRes.ok) return null;

    const latest  = await latestRes.json() as { base: string; date: string; rates: { USD: number } };
    const hist    = await histRes.json() as { rates: Record<string, { USD: number }> };

    const sortedDates = Object.keys(hist.rates).sort();
    const history: PricePoint[] = sortedDates.map((date) => ({
      date,
      price: hist.rates[date].USD,
    }));

    // Ensure latest is included
    if (!history.find((p) => p.date === latest.date)) {
      history.push({ date: latest.date, price: latest.rates.USD });
    }

    const currentPrice = latest.rates.USD;
    const previousClose = history.length >= 2 ? history[history.length - 2].price : currentPrice;
    const change = currentPrice - previousClose;

    return {
      id: "currency",
      name: "GBP / USD",
      ticker: "GBP/USD",
      currentPrice,
      previousClose,
      change,
      changePercent: (change / previousClose) * 100,
      unit: "USD per GBP",
      history: history.slice(-10),
      source: "live",
      asOf: latest.date,
    };
  } catch {
    return null;
  }
}

// ─── Main fetch function ──────────────────────────────────────────────────────
export async function fetchMarketData(id: MarketId): Promise<MarketData> {
  // Try real API for currency
  if (id === "currency") {
    const live = await fetchLiveCurrency();
    if (live) return live;
  }

  // Simulated fallback for all
  const cfg = CONFIGS[id];
  const history = generateSimulatedHistory(id, 10);
  const currentPrice   = history[history.length - 1].price;
  const previousClose  = history.length >= 2 ? history[history.length - 2].price : currentPrice;
  const change         = currentPrice - previousClose;

  return {
    id,
    name: cfg.name,
    ticker: cfg.ticker,
    currentPrice,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    unit: cfg.unit,
    history,
    source: "simulated",
    asOf: new Date().toISOString().split("T")[0],
  };
}

// All available markets (for custom-scenario picker)
export const ALL_MARKETS: { id: MarketId; label: string }[] = [
  { id: "wheat",    label: "Wheat (CBOT)" },
  { id: "oil",      label: "Crude Oil WTI" },
  { id: "currency", label: "GBP/USD Forex" },
];


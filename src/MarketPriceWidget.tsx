import { useState, useEffect, useCallback } from "react";
import { MarketId, MarketData, PricePoint, fetchMarketData, ALL_MARKETS } from "./marketData";

// ─── Formats ─────────────────────────────────────────────────────────────────
const priceFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function fmt(v: number) { return priceFmt.format(v); }
function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtDateShort(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ history, isUp }: { history: PricePoint[]; isUp: boolean }) {
  if (history.length < 2) return null;

  const prices = history.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || minP * 0.01;

  const W = 140, H = 52, PAD = 4;
  const toX = (i: number) => PAD + (i / (prices.length - 1)) * (W - PAD * 2);
  const toY = (p: number) => H - PAD - ((p - minP) / range) * (H - PAD * 2);

  const linePts = prices.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(" ");
  const pathD = "M " + prices.map((p, i) => `${toX(i).toFixed(1)} ${toY(p).toFixed(1)}`).join(" L ");
  const areaD = `${pathD} L ${toX(prices.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;

  const color = isUp ? "#14804a" : "#c33b3b";
  const gradId = `sg-${isUp ? "u" : "d"}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mkt-sparkline" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Zero-ish reference line */}
      <line x1={PAD} x2={W - PAD} y1={toY(prices[0])} y2={toY(prices[0])} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
      <path d={areaD} fill={`url(#${gradId})`} />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Highlight last point */}
      <circle cx={toX(prices.length - 1)} cy={toY(prices[prices.length - 1])} r="3.5" fill={color} />
      <circle cx={toX(prices.length - 1)} cy={toY(prices[prices.length - 1])} r="6" fill={color} fillOpacity="0.18" />
    </svg>
  );
}

// ─── OHLC mini bar ────────────────────────────────────────────────────────────
function OhlcBar({ point, isToday }: { point: PricePoint; isToday: boolean }) {
  const isUp = point.price >= (point.open ?? point.price);
  const color = isUp ? "#14804a" : "#c33b3b";
  return (
    <div className={`mkt-hist-col ${isToday ? "mkt-hist-today" : ""}`} title={`Open: ${fmt(point.open ?? point.price)}  High: ${fmt(point.high ?? point.price)}  Low: ${fmt(point.low ?? point.price)}  Close: ${fmt(point.price)}`}>
      <div className="mkt-hist-date">{fmtDateShort(point.date)}</div>
      <div className="mkt-hist-price" style={{ color }}>{fmt(point.price)}</div>
      <div className="mkt-hist-chg" style={{ color: isUp ? "#14804a" : "#c33b3b", fontSize: 10 }}>
        {isUp ? "▲" : "▼"}
      </div>
    </div>
  );
}

// ─── Custom market picker (for the "Custom" scenario) ────────────────────────
interface CustomPickerProps {
  value: MarketId | null;
  onChange: (id: MarketId | null) => void;
}
function CustomMarketPicker({ value, onChange }: CustomPickerProps) {
  return (
    <div className="mkt-custom-picker">
      <span className="mkt-custom-label">📊 Track a reference market</span>
      <select
        className="mkt-custom-select"
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value as MarketId) || null)}
      >
        <option value="">— None —</option>
        {ALL_MARKETS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
interface MarketPriceWidgetProps {
  /** If null, show the custom picker */
  marketId: MarketId | null;
  /** Called when user is on the "Custom" scenario and picks a market */
  onCustomMarketChange?: (id: MarketId | null) => void;
  /** Called when user clicks "Use as ST" */
  onApplyPrice?: (price: number) => void;
}

export default function MarketPriceWidget({
  marketId,
  onCustomMarketChange,
  onApplyPrice,
}: MarketPriceWidgetProps) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");

  const load = useCallback(async (id: MarketId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMarketData(id);
      setData(result);
    } catch {
      setError("Failed to load market data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!marketId) { setData(null); return; }
    setData(null);
    load(marketId);
  }, [marketId, load]);

  const isUp = (data?.change ?? 0) >= 0;
  const changeClass = isUp ? "mkt-up" : "mkt-dn";
  const today = new Date().toISOString().split("T")[0];

  // If no marketId set (custom scenario with no market chosen), show just the picker
  if (!marketId) {
    return (
      <div className="mkt-wrapper">
        <CustomMarketPicker value={null} onChange={onCustomMarketChange ?? (() => {})} />
      </div>
    );
  }

  return (
    <div className="mkt-wrapper">
      {/* Show picker only when it's the custom scenario */}
      {onCustomMarketChange && (
        <CustomMarketPicker value={marketId} onChange={onCustomMarketChange} />
      )}

      <div className="mkt-card">
        {/* ── Card header ── */}
        <div className="mkt-card-header">
          <div className="mkt-identity">
            <span className="mkt-name">{data?.name ?? LOADING_NAMES[marketId]}</span>
            <span className="mkt-ticker">{data?.ticker ?? ""}</span>
            {data && (
              <span className={`mkt-source-pill ${data.source === "live" ? "live" : "sim"}`}>
                {data.source === "live" ? "● Live" : "◉ Simulated"}
              </span>
            )}
          </div>
          <div className="mkt-header-actions">
            <button
              className={`mkt-view-btn ${view === "chart" ? "active" : ""}`}
              onClick={() => setView("chart")}
              title="Sparkline view"
            >
              📈
            </button>
            <button
              className={`mkt-view-btn ${view === "table" ? "active" : ""}`}
              onClick={() => setView("table")}
              title="Table view"
            >
              📋
            </button>
            <button
              className="mkt-refresh-btn"
              onClick={() => load(marketId)}
              disabled={loading}
              title="Refresh"
            >
              {loading ? "⟳" : "↻"}
            </button>
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && !data && (
          <div className="mkt-skeleton">
            <div className="mkt-skel-price" />
            <div className="mkt-skel-chart" />
          </div>
        )}

        {/* ── Error state ── */}
        {error && !data && (
          <div className="mkt-error">
            ⚠ {error}
            <button className="mkt-retry" onClick={() => load(marketId)}>Retry</button>
          </div>
        )}

        {/* ── Main content ── */}
        {data && (
          <div className="mkt-content">
            {/* Price + change */}
            <div className="mkt-price-block">
              <div className="mkt-current-price">{fmt(data.currentPrice)}</div>
              <div className={`mkt-change-row ${changeClass}`}>
                <span className="mkt-arrow">{isUp ? "▲" : "▼"}</span>
                <span>{fmt(Math.abs(data.change))}</span>
                <span className="mkt-pct">
                  ({data.changePercent >= 0 ? "+" : ""}{data.changePercent.toFixed(2)}%)
                </span>
                <span className="mkt-vs">vs prev close</span>
              </div>
              <div className="mkt-unit-line">{data.unit}</div>
              <div className="mkt-ohlc-row">
                <span>Prev close <strong>{fmt(data.previousClose)}</strong></span>
                {data.history.length > 0 && data.history[data.history.length - 1].high && (
                  <>
                    <span>High <strong className="mkt-up">{fmt(data.history[data.history.length - 1].high!)}</strong></span>
                    <span>Low <strong className="mkt-dn">{fmt(data.history[data.history.length - 1].low!)}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Chart / Table toggle */}
            {view === "chart" ? (
              <div className="mkt-chart-block">
                <Sparkline history={data.history} isUp={isUp} />
                <div className="mkt-chart-range">
                  {data.history.length > 0 && (
                    <span>{fmtDate(data.history[0].date)} – {fmtDate(data.history[data.history.length - 1].date)}</span>
                  )}
                </div>
                {/* Mini day strip below sparkline */}
                <div className="mkt-hist-strip">
                  {data.history.slice(-7).map((pt) => (
                    <OhlcBar key={pt.date} point={pt} isToday={pt.date === today} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mkt-table-block">
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Close</th>
                      <th>Open</th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Chg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.history].reverse().map((pt, idx, arr) => {
                      const prev = arr[idx + 1];
                      const dayChg = prev ? pt.price - prev.price : 0;
                      const up = dayChg >= 0;
                      return (
                        <tr key={pt.date} className={pt.date === today ? "mkt-row-today" : ""}>
                          <td>{fmtDate(pt.date)}</td>
                          <td className={up ? "mkt-up" : "mkt-dn"}><strong>{fmt(pt.price)}</strong></td>
                          <td>{pt.open != null ? fmt(pt.open) : "—"}</td>
                          <td className="mkt-up">{pt.high != null ? fmt(pt.high) : "—"}</td>
                          <td className="mkt-dn">{pt.low != null ? fmt(pt.low) : "—"}</td>
                          <td className={up ? "mkt-up" : "mkt-dn"}>
                            {prev ? `${up ? "+" : ""}${fmt(dayChg)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer actions */}
            <div className="mkt-card-footer">
              <span className="mkt-as-of">
                {data.source === "live"
                  ? `🟢 Live · Frankfurter API · as of ${data.asOf}`
                  : `🔵 Simulated demo data · as of ${data.asOf}`}
              </span>
              {onApplyPrice && (
                <button className="mkt-apply-btn" onClick={() => onApplyPrice(data.currentPrice)}>
                  Use as ST ↗
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const LOADING_NAMES: Record<MarketId, string> = {
  wheat: "Wheat (CBOT)",
  oil: "Crude Oil WTI",
  currency: "GBP / USD",
};


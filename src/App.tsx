import { useMemo, useState } from "react";
import {
  calculateBuyerPayoff,
  calculateForwardPayoffs,
  calculateSellerPayoff,
} from "./payoff";
import { useAuth } from "./AuthContext";
import { saveTransaction } from "./transactions";
import TransactionHistory from "./TransactionHistory";
import MarketPriceWidget from "./MarketPriceWidget";
import { MarketId, SCENARIO_MARKET_MAP } from "./marketData";

type FieldName = "F" | "n" | "ST";

interface Scenario {
  id: string;
  label: string;
  description: string;
  F: string;
  n: string;
  ST: string;
  units: string;
}

const scenarios: Scenario[] = [
  {
    id: "custom",
    label: "Custom",
    description: "Enter your own agreed price, quantity, and maturity price. Choose an example to load preset values.",
    F: "",
    n: "",
    ST: "",
    units: "units",
  },
  {
    id: "wheat",
    label: "Wheat",
    description: "A bakery hedges the price of 5,000 kg of wheat.",
    F: "0.50",
    n: "5000",
    ST: "0.62",
    units: "kg",
  },
  {
    id: "currency",
    label: "Currency",
    description: "An importer hedges GBP 100,000 at an agreed USD/GBP rate.",
    F: "1.5500",
    n: "100000",
    ST: "1.6000",
    units: "GBP",
  },
  {
    id: "oil",
    label: "Oil",
    description: "A speculator takes a position on 500 barrels of oil.",
    F: "80",
    n: "500",
    ST: "75",
    units: "barrels",
  },
];

const initialScenario = scenarios[0];
const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const priceFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function formatAmount(value: number): string {
  return `${value >= 0 ? "+" : "−"}${numberFormat.format(Math.abs(value))}`;
}

function parseInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateInput(field: FieldName, value: string): string | null {
  const number = parseInput(value);
  const label = field === "F" ? "Agreed price (F)" : field === "n" ? "Quantity (n)" : "Market price at maturity (ST)";
  if (number === null) return `${label} must be a number.`;
  if ((field === "F" || field === "n") && number <= 0) return `${label} must be greater than zero.`;
  if (field === "ST" && number < 0) return "Market price at maturity (ST) cannot be negative.";
  return null;
}

function Field({
  id,
  label,
  symbol,
  value,
  unit,
  error,
  onChange,
}: {
  id: FieldName;
  label: string;
  symbol: string;
  value: string;
  unit: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label} <span className="symbol">({symbol})</span></span>
      <span className="input-wrap">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="input-unit">{unit}</span>
      </span>
      {error && <span id={errorId} className="field-error" role="alert">{error}</span>}
    </label>
  );
}

function PayoffChart({
  F,
  n,
  ST,
}: {
  F: number;
  n: number;
  ST: number;
}) {
  const width = 760;
  const height = 340;
  const left = 82;
  const right = 26;
  const top = 24;
  const bottom = 64;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const minPrice = F * 0.5;
  const maxPrice = F * 1.5;
  const maxPayoff = n * F * 0.5;
  const x = (price: number) => left + ((price - minPrice) / (maxPrice - minPrice)) * plotWidth;
  const y = (payoff: number) => top + ((maxPayoff - payoff) / (2 * maxPayoff)) * plotHeight;
  const zeroY = y(0);
  const contractX = x(F);
  const shownST = Math.max(minPrice, Math.min(maxPrice, ST));
  const currentX = x(shownST);
  const buyerAtCurrent = calculateBuyerPayoff(F, n, ST);
  const sellerAtCurrent = calculateSellerPayoff(F, n, ST);
  const markerY = (payoff: number) => Math.max(top, Math.min(top + plotHeight, y(payoff)));
  const ticks = [minPrice, F * 0.75, F, F * 1.25, maxPrice];

  return (
    <div className="chart-scroll">
      <svg
        className="payoff-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Payoff chart from ${priceFormat.format(minPrice)} to ${priceFormat.format(maxPrice)}. Buyer payoff rises and seller payoff falls, crossing zero at F ${priceFormat.format(F)}. Current ST is ${priceFormat.format(ST)}.`}
      >
        <text x={left} y={14} className="axis-title">Payoff</text>
        <line x1={left} x2={width - right} y1={top} y2={top} className="grid-line" />
        <line x1={left} x2={width - right} y1={top + plotHeight / 2} y2={top + plotHeight / 2} className="zero-line" />
        <line x1={left} x2={width - right} y1={top + plotHeight} y2={top + plotHeight} className="grid-line" />
        <line x1={left} x2={left} y1={top} y2={top + plotHeight} className="axis-line" />
        <line x1={left} x2={width - right} y1={top + plotHeight} y2={top + plotHeight} className="axis-line" />
        <text x={left - 10} y={top + 5} textAnchor="end" className="tick-label">{numberFormat.format(maxPayoff)}</text>
        <text x={left - 10} y={zeroY + 4} textAnchor="end" className="tick-label">0</text>
        <text x={left - 10} y={top + plotHeight + 4} textAnchor="end" className="tick-label">{numberFormat.format(-maxPayoff)}</text>
        <line x1={contractX} x2={contractX} y1={top} y2={top + plotHeight} className="contract-line" />
        <path d={`M ${x(minPrice)} ${y(calculateBuyerPayoff(F, n, minPrice))} L ${x(maxPrice)} ${y(calculateBuyerPayoff(F, n, maxPrice))}`} className="buyer-line" />
        <path d={`M ${x(minPrice)} ${y(calculateSellerPayoff(F, n, minPrice))} L ${x(maxPrice)} ${y(calculateSellerPayoff(F, n, maxPrice))}`} className="seller-line" />
        <circle cx={currentX} cy={markerY(buyerAtCurrent)} r={ST === F ? 8 : 7} className="buyer-dot" />
        <circle cx={currentX} cy={markerY(sellerAtCurrent)} r={ST === F ? 4 : 7} className="seller-dot" />
        {ticks.map((tick, index) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={top + plotHeight} y2={top + plotHeight + 5} className="axis-line" />
            <text x={x(tick)} y={top + plotHeight + 21} textAnchor="middle" className="tick-label">
              {priceFormat.format(tick)}
            </text>
            {index === 2 && <text x={x(tick)} y={top + plotHeight + 38} textAnchor="middle" className="contract-label">F</text>}
          </g>
        ))}
        <text x={left + plotWidth / 2} y={height - 5} textAnchor="middle" className="axis-title">Market price at maturity (ST)</text>
      </svg>
      <div className="chart-legend">
        <span><i className="legend-line buyer-legend" />Buyer (long)</span>
        <span><i className="legend-line seller-legend" />Seller (short)</span>
        <span><i className="legend-dash" />Agreed price F</span>
        <span><i className="legend-dot" />Current ST</span>
      </div>
      {ST < minPrice || ST > maxPrice ? (
        <p className="chart-note">Current ST is outside the displayed 50%–150% F range; its markers are shown at the nearest chart edge.</p>
      ) : null}
    </div>
  );
}

function App() {
  const { user, logout } = useAuth();
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [values, setValues] = useState({ F: "", n: "", ST: "" });
  const [showHistory, setShowHistory] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [customMarketId, setCustomMarketId] = useState<MarketId | null>(null);

  // Resolve the market to track: predefined scenarios have a fixed market,
  // the custom scenario lets the user pick one manually.
  const activeMarketId: MarketId | null =
    scenarioId === "custom"
      ? customMarketId
      : (SCENARIO_MARKET_MAP[scenarioId] ?? null);

  const applyMarketPrice = (price: number) => {
    setField("ST", price.toFixed(4));
  };

  const scenario = scenarios.find((item) => item.id === scenarioId) ?? initialScenario;
  const errors = {
    F: validateInput("F", values.F),
    n: validateInput("n", values.n),
    ST: validateInput("ST", values.ST),
  };
  const valid = !errors.F && !errors.n && !errors.ST;

  const result = useMemo(() => {
    if (!valid) return null;
    return calculateForwardPayoffs(Number(values.F), Number(values.n), Number(values.ST));
  }, [valid, values.F, values.n, values.ST]);

  const setField = (field: FieldName, value: string) => {
    setScenarioId("custom");
    setValues((current) => ({ ...current, [field]: value }));
  };

  const chooseScenario = (id: string) => {
    const next = scenarios.find((item) => item.id === id);
    if (!next) return;
    setScenarioId(id);
    setValues({ F: next.F, n: next.n, ST: next.ST });
  };

  const handleSave = () => {
    if (!user || !result) return;
    saveTransaction(user, {
      scenarioLabel: scenario.label,
      F: Number(values.F),
      n: Number(values.n),
      ST: Number(values.ST),
      units: scenario.units,
      buyerPayoff: result.buyer,
      sellerPayoff: result.seller,
      notional: result.notional,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const F = Number(values.F);
  const n = Number(values.n);
  const ST = Number(values.ST);
  const marketMessage = !result
    ? ""
    : ST === F
      ? "At maturity, ST equals F: nobody gains or loses."
      : ST > F
        ? "Price rose above the agreed price: the buyer gains and the seller loses."
        : "Price fell below the agreed price: the buyer loses and the seller gains.";

  return (
    <main className="page-shell">
      {/* ── Top nav bar ── */}
      <nav className="top-nav">
        <div className="nav-brand">📈 Forward Calculator</div>
        {user && (
          <div className="nav-actions">
            <span className="nav-user">👤 {user}</span>
            <button className="nav-btn" onClick={() => setShowHistory(true)}>History</button>
            <button className="nav-btn nav-btn-outline" onClick={logout}>Sign Out</button>
          </div>
        )}
      </nav>

      <header className="page-header">
        <div className="eyebrow">FINANCIAL ENGINEERING · MATURITY PAYOFFS</div>
        <h1>Forward Contract Calculator</h1>
        <p>A forward is a private agreement to buy or sell an asset at a price fixed today, for delivery on a future date.</p>
      </header>

      <section className="panel inputs-panel" aria-labelledby="inputs-heading">
        <div className="section-heading">
          <div>
            <div className="section-kicker">SET UP A CONTRACT</div>
            <h2 id="inputs-heading">Enter the contract details</h2>
          </div>
          <label className="scenario-select">
            <span>Example scenario</span>
            <select value={scenarioId} onChange={(event) => chooseScenario(event.target.value)}>
              {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <p className="scenario-description">{scenario.description}</p>

        {/* ── Market price tracker ── */}
        <MarketPriceWidget
          marketId={activeMarketId}
          onCustomMarketChange={scenarioId === "custom" ? setCustomMarketId : undefined}
          onApplyPrice={applyMarketPrice}
        />

        <div className="input-grid">
          <Field id="F" label="Agreed (forward) price" symbol="F" value={values.F} unit={`per ${scenario.units}`} error={errors.F} onChange={(value) => setField("F", value)} />
          <Field id="n" label="Quantity" symbol="n" value={values.n} unit={scenario.units} error={errors.n} onChange={(value) => setField("n", value)} />
          <Field id="ST" label="Market price at maturity" symbol="ST" value={values.ST} unit={`per ${scenario.units}`} error={errors.ST} onChange={(value) => setField("ST", value)} />
        </div>
        <div className="input-footnote">
          <span>Notional value</span>
          <strong>{result ? numberFormat.format(result.notional) : "—"}</strong>
          <span className="formula-hint">F × n</span>

          {/* Save button — only shown when logged in and result is valid */}
          {user && result && (
            <button className={`save-btn ${savedToast ? "saved" : ""}`} onClick={handleSave} disabled={savedToast}>
              {savedToast ? "✓ Saved!" : "💾 Save Transaction"}
            </button>
          )}
          {!user && result && (
            <span className="save-hint">Sign in to save this transaction.</span>
          )}
        </div>
        <p className="data-note">Uses only the numbers you enter; no real market data.</p>
      </section>

      {result ? (
        <>
          <section className="results-section" aria-labelledby="results-heading">
            <div className="results-heading">
              <div>
                <div className="section-kicker">AT MATURITY</div>
                <h2 id="results-heading">Who gains and who loses?</h2>
              </div>
              <div className="zero-sum-check"><span className="check-mark">✓</span> Zero-sum check <strong>{numberFormat.format(result.buyer + result.seller)}</strong></div>
            </div>
            <p className="market-message" aria-live="polite">{marketMessage}</p>
            <div className="payoff-cards">
              <article className="payoff-card buyer-card">
                <div className="card-party">BUYER <span>(LONG)</span></div>
                <div className={`payoff-amount ${result.buyer >= 0 ? "profit" : "loss"}`}>{formatAmount(result.buyer)}</div>
                <div className="calculation">n × (ST − F) = {numberFormat.format(n)} × ({priceFormat.format(ST)} − {priceFormat.format(F)})</div>
              </article>
              <article className="payoff-card seller-card">
                <div className="card-party">SELLER <span>(SHORT)</span></div>
                <div className={`payoff-amount ${result.seller >= 0 ? "profit" : "loss"}`}>{formatAmount(result.seller)}</div>
                <div className="calculation">n × (F − ST) = {numberFormat.format(n)} × ({priceFormat.format(F)} − {priceFormat.format(ST)})</div>
              </article>
            </div>
            <p className="zero-sum-detail">Buyer (long) payoff + seller (short) payoff = 0. At break-even, ST = F and both payoffs are zero.</p>
          </section>

          <section className="panel chart-panel" aria-labelledby="chart-heading">
            <div className="section-heading compact-heading">
              <div>
                <div className="section-kicker">PAYOFF PROFILE</div>
                <h2 id="chart-heading">Payoff across market prices</h2>
              </div>
              <span className="range-badge">50%–150% of F</span>
            </div>
            <PayoffChart F={F} n={n} ST={ST} />
          </section>

          <section className="panel what-if-panel" aria-labelledby="what-if-heading">
            <div className="section-heading compact-heading">
              <div>
                <div className="section-kicker">SCENARIO COMPARISON</div>
                <h2 id="what-if-heading">What if the price moves?</h2>
              </div>
              <span className="table-units">Payoff amounts</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Market price at maturity (ST)</th><th>Buyer (long)</th><th>Seller (short)</th></tr>
                </thead>
                <tbody>
                  {[
                    { label: "20% below F", price: F * 0.8 },
                    { label: "10% below F", price: F * 0.9 },
                    { label: "Equal to F", price: F },
                    { label: "10% above F", price: F * 1.1 },
                    { label: "20% above F", price: F * 1.2 },
                  ].map((row) => {
                    const buyer = calculateBuyerPayoff(F, n, row.price);
                    const seller = calculateSellerPayoff(F, n, row.price);
                    return (
                      <tr key={row.label}>
                        <th scope="row">{row.label}<span className="table-price">ST = {priceFormat.format(row.price)}</span></th>
                        <td className={buyer >= 0 ? "profit" : "loss"}>{formatAmount(buyer)}</td>
                        <td className={seller >= 0 ? "profit" : "loss"}>{formatAmount(seller)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel results-placeholder" aria-live="polite">
          <div className="placeholder-icon">!</div>
          <div>
            <h2>Check the highlighted input</h2>
            <p>Enter a valid number for each field to see the payoffs, chart, and price scenarios.</p>
          </div>
        </section>
      )}

      <footer className="page-footer">Forward contracts are zero-sum at maturity: one party's gain is the other party's loss.</footer>

      {/* Transaction history slide-over */}
      {showHistory && <TransactionHistory onClose={() => setShowHistory(false)} />}
    </main>
  );
}

export default App;

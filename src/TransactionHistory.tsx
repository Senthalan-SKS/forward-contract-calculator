import { useState } from "react";
import { Transaction, getTransactions, deleteTransaction, clearTransactions } from "./transactions";
import { useAuth } from "./AuthContext";

const numberFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const priceFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function formatAmount(value: number): string {
  return `${value >= 0 ? "+" : "−"}${numberFormat.format(Math.abs(value))}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

interface Props {
  onClose: () => void;
}

export default function TransactionHistory({ onClose }: Props) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    user ? getTransactions(user) : []
  );
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!user) return null;

  const handleDelete = (id: string) => {
    deleteTransaction(user, id);
    setTransactions(getTransactions(user));
  };

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearTransactions(user);
    setTransactions([]);
    setConfirmClear(false);
  };

  return (
    <div className="history-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="history-panel">
        {/* Header */}
        <div className="history-header">
          <div>
            <div className="section-kicker">ACCOUNT HISTORY</div>
            <h2>Past Transactions</h2>
            <p className="history-subtext">Saved calculations for <strong>{user}</strong></p>
          </div>
          <button className="history-close" onClick={onClose} aria-label="Close history">✕</button>
        </div>

        {transactions.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">📋</div>
            <p>No saved transactions yet.</p>
            <p className="history-empty-hint">Calculate a contract and click <strong>Save Transaction</strong> to record it here.</p>
          </div>
        ) : (
          <>
            <div className="history-toolbar">
              <span className="history-count">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
              <button
                className={`history-clear-btn ${confirmClear ? "confirm" : ""}`}
                onClick={handleClearAll}
              >
                {confirmClear ? "⚠️ Confirm clear all" : "Clear all"}
              </button>
              {confirmClear && (
                <button className="history-cancel-btn" onClick={() => setConfirmClear(false)}>Cancel</button>
              )}
            </div>

            <div className="history-list">
              {transactions.map((tx) => {
                const expanded = expandedId === tx.id;
                const buyerGain = tx.buyerPayoff >= 0;
                return (
                  <div key={tx.id} className="history-item">
                    <div
                      className="history-item-header"
                      onClick={() => setExpandedId(expanded ? null : tx.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedId(expanded ? null : tx.id)}
                      aria-expanded={expanded}
                    >
                      <div className="history-item-meta">
                        <span className="history-scenario-badge">{tx.scenarioLabel}</span>
                        <span className="history-date">{formatDate(tx.date)}</span>
                      </div>
                      <div className="history-item-summary">
                        <div className="history-notional">
                          Notional: <strong>{numberFormat.format(tx.notional)}</strong>
                          <span className="history-units"> ({tx.units})</span>
                        </div>
                        <div className="history-payoffs">
                          <span className={buyerGain ? "profit" : "loss"}>Buyer: {formatAmount(tx.buyerPayoff)}</span>
                          <span className={!buyerGain ? "profit" : "loss"}>Seller: {formatAmount(tx.sellerPayoff)}</span>
                        </div>
                      </div>
                      <span className="history-chevron">{expanded ? "▲" : "▼"}</span>
                    </div>

                    {expanded && (
                      <div className="history-item-detail">
                        <div className="history-detail-grid">
                          <div className="history-detail-item">
                            <span>Agreed Price (F)</span>
                            <strong>{priceFormat.format(tx.F)}</strong>
                          </div>
                          <div className="history-detail-item">
                            <span>Quantity (n)</span>
                            <strong>{numberFormat.format(tx.n)} {tx.units}</strong>
                          </div>
                          <div className="history-detail-item">
                            <span>Market Price at Maturity (ST)</span>
                            <strong>{priceFormat.format(tx.ST)}</strong>
                          </div>
                          <div className="history-detail-item">
                            <span>Notional Value (F × n)</span>
                            <strong>{numberFormat.format(tx.notional)}</strong>
                          </div>
                          <div className="history-detail-item">
                            <span>Buyer Payoff</span>
                            <strong className={tx.buyerPayoff >= 0 ? "profit" : "loss"}>{formatAmount(tx.buyerPayoff)}</strong>
                          </div>
                          <div className="history-detail-item">
                            <span>Seller Payoff</span>
                            <strong className={tx.sellerPayoff >= 0 ? "profit" : "loss"}>{formatAmount(tx.sellerPayoff)}</strong>
                          </div>
                        </div>
                        <div className="history-item-actions">
                          <button className="history-delete-btn" onClick={() => handleDelete(tx.id)}>
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


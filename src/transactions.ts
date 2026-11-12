// ---------------------------------------------------------------------------
// Transaction history — stored per user in localStorage. Demo only.
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string;
  date: string; // ISO string
  scenarioLabel: string;
  F: number;
  n: number;
  ST: number;
  units: string;
  buyerPayoff: number;
  sellerPayoff: number;
  notional: number;
}

function storageKey(username: string): string {
  return `fcc_transactions_${username}`;
}

export function getTransactions(username: string): Transaction[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(username)) ?? "[]") as Transaction[];
  } catch {
    return [];
  }
}

export function saveTransaction(username: string, tx: Omit<Transaction, "id" | "date">): Transaction {
  const full: Transaction = {
    ...tx,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
  };
  const existing = getTransactions(username);
  const updated = [full, ...existing]; // newest first
  localStorage.setItem(storageKey(username), JSON.stringify(updated));
  return full;
}

export function deleteTransaction(username: string, id: string): void {
  const existing = getTransactions(username).filter((t) => t.id !== id);
  localStorage.setItem(storageKey(username), JSON.stringify(existing));
}

export function clearTransactions(username: string): void {
  localStorage.removeItem(storageKey(username));
}


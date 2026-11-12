export interface ForwardPayoffs {
  buyer: number;
  seller: number;
  notional: number;
}

// The buyer's long payoff is n multiplied by the maturity-price change.
export function calculateBuyerPayoff(F: number, n: number, ST: number): number {
  return n * (ST - F);
}

// The seller's short payoff is the equal and opposite price change.
export function calculateSellerPayoff(F: number, n: number, ST: number): number {
  return n * (F - ST);
}

export function calculateForwardPayoffs(F: number, n: number, ST: number): ForwardPayoffs {
  return {
    buyer: calculateBuyerPayoff(F, n, ST),
    seller: calculateSellerPayoff(F, n, ST),
    notional: F * n,
  };
}

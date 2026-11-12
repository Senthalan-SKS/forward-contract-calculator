import { describe, expect, it } from "vitest";
import { calculateForwardPayoffs } from "./payoff";

const examples = [
  { F: 100, n: 1_000, ST: 110, buyer: 10_000, seller: -10_000 },
  { F: 100, n: 1_000, ST: 90, buyer: -10_000, seller: 10_000 },
  { F: 100, n: 1_000, ST: 100, buyer: 0, seller: 0 },
  { F: 0.5, n: 5_000, ST: 0.62, buyer: 600, seller: -600 },
  { F: 1.55, n: 100_000, ST: 1.6, buyer: 5_000, seller: -5_000 },
  { F: 80, n: 500, ST: 75, buyer: -2_500, seller: 2_500 },
];

describe("forward contract payoffs", () => {
  it.each(examples)("calculates the expected result for F=$F, n=$n, ST=$ST", (example) => {
    const result = calculateForwardPayoffs(example.F, example.n, example.ST);

    expect(result.buyer).toBeCloseTo(example.buyer, 8);
    expect(result.seller).toBeCloseTo(example.seller, 8);
  });

  it.each(examples)("keeps the contract zero-sum for F=$F, n=$n, ST=$ST", ({ F, n, ST }) => {
    const result = calculateForwardPayoffs(F, n, ST);

    expect(result.buyer + result.seller).toBeCloseTo(0, 8);
  });

  it("calculates notional value as F multiplied by n", () => {
    expect(calculateForwardPayoffs(0.5, 5_000, 0.62).notional).toBe(2_500);
  });
});

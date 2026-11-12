# Forward Contract Calculator

A one-screen teaching tool that calculates the maturity payoffs of a forward contract for the buyer (long) and seller (short). It uses only the numbers entered in the form and does not use real market data.

## What it shows

- The contract notional value, `F × n`.
- The buyer (long) and seller (short) payoff, formatted as signed amounts.
- A zero-sum check, a break-even explanation, and the calculation steps.
- A payoff graph for market prices from 50% to 150% of `F`, including the current `ST`.
- A comparison table at 20% below, 10% below, equal to, 10% above, and 20% above `F`.
- Blank inputs on startup, with optional Wheat, Currency, and Oil examples available from the scenario selector.

## Formulas

- Buyer (long) payoff: `n × (ST − F)`
- Seller (short) payoff: `n × (F − ST)`
- Notional value: `F × n`

`F` is the agreed (forward) price per unit, `n` is the contract quantity, and `ST` is the market price at maturity. The buyer and seller payoffs add to zero. At break-even, `ST = F`, so both payoffs are zero.

## Run locally

Requires Node.js 18 or later and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Run tests

```sh
npm test
```

The automated tests cover all six specified numeric examples, notional value, and the zero-sum payoff property.

## Build

```sh
npm run build
```

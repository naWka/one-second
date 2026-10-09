// Calculator data: who gets what from a card-present coffee purchase.
// Every number is linked to FACTS.md (fact numbers in the comments).
//
// Model: a small café pays its acquirer one published blended price (Stripe
// Terminal). Out of it come interchange (to the issuing bank) and the network's
// fee; the acquirer keeps the rest. So:
//   acquirer markup = total − interchange − scheme   (an estimate, may be negative)
//
// kind: 'cap'      — a legal ceiling (FACTS §14, §15), high confidence
//       'tariff'   — a published price list (Visa, Stripe), high confidence
//       'estimate' — derived from public data, shown as «оценка»

export type RegionKey = 'eu-debit' | 'eu-credit' | 'us-debit' | 'us-credit';
export type Kind = 'cap' | 'tariff' | 'estimate';
export type Rate = { pct: number; fixed: number; min?: number; kind: Kind; source: string };
export type RegionFees = {
  symbol: '€' | '$';
  interchange: Rate;
  scheme: Rate;
  /** What the café pays in total. */
  total: Rate;
  explain: 'explainEU' | 'explainUSDebit' | 'explainUSCredit';
};

// Stripe Terminal, Germany, EEA cards: 1.4% + €0.10 — https://stripe.com/de/pricing (FACTS §18)
const STRIPE_EU: Rate = { pct: 0.014, fixed: 0.1, kind: 'tariff', source: 'Stripe Terminal, ЕС' };
// Stripe Terminal, US cards: 2.7% + 5¢ — https://stripe.com/pricing (FACTS §18)
const STRIPE_US: Rate = { pct: 0.027, fixed: 0.05, kind: 'tariff', source: 'Stripe Terminal, США' };

export const FEES: Record<RegionKey, RegionFees> = {
  'eu-debit': {
    symbol: '€',
    // Regulation (EU) 2015/751, Art. 3(1): ≤ 0.2% for consumer debit (FACTS §14)
    interchange: { pct: 0.002, fixed: 0, kind: 'cap', source: 'Регламент ЕС 2015/751, ст. 3' },
    // EC/EY study: 0.036% (debit, 2017) + ≥25% growth since (PSR 2025) + fixed parts ≈ 0.1% (FACTS §17)
    scheme: { pct: 0.001, fixed: 0, kind: 'estimate', source: 'исследование для Еврокомиссии + PSR' },
    total: STRIPE_EU,
    explain: 'explainEU',
  },
  'eu-credit': {
    symbol: '€',
    // Regulation (EU) 2015/751, Art. 4: ≤ 0.3% for consumer credit (FACTS §14)
    interchange: { pct: 0.003, fixed: 0, kind: 'cap', source: 'Регламент ЕС 2015/751, ст. 4' },
    // EC/EY study: 0.083% (credit, 2017) + growth ≈ 0.1% (FACTS §17)
    scheme: { pct: 0.001, fixed: 0, kind: 'estimate', source: 'исследование для Еврокомиссии + PSR' },
    total: STRIPE_EU,
    explain: 'explainEU',
  },
  'us-debit': {
    symbol: '$',
    // Regulation II, covered issuers: 21¢ + 0.05% + 1¢ fraud-prevention adjustment (FACTS §15)
    interchange: { pct: 0.0005, fixed: 0.22, kind: 'cap', source: 'Regulation II: 21¢ + 0,05% + 1¢' },
    // Wells Fargo pass-through, Visa debit: 0.13% + $0.0155 per authorization (FACTS §17)
    scheme: { pct: 0.0013, fixed: 0.0155, kind: 'estimate', source: 'сборы Visa по прайсу Wells Fargo' },
    total: STRIPE_US,
    explain: 'explainUSDebit',
  },
  'us-credit': {
    symbol: '$',
    // Visa USA interchange, Consumer Credit, Card Present, Restaurant, Traditional: 2.10% (min $0.04) (FACTS §16)
    interchange: { pct: 0.021, fixed: 0, min: 0.04, kind: 'tariff', source: 'тариф Visa для кафе, 2,10%' },
    // Wells Fargo pass-through, Visa credit: 0.14% + $0.0195 per authorization (FACTS §17)
    scheme: { pct: 0.0014, fixed: 0.0195, kind: 'estimate', source: 'сборы Visa по прайсу Wells Fargo' },
    total: STRIPE_US,
    explain: 'explainUSCredit',
  },
};

export const rate = (r: Rate, amount: number) => Math.max(r.min ?? 0, r.pct * amount + r.fixed);

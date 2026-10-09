// HUD timer choreography: transaction time (ms) at the start and end of each scene.
// Values follow FACTS.md (section "Рекомендации по таймингам HUD") and STORYBOARD.md.
// Only the card–terminal limit (< 500 ms) is a sourced number; the stage
// boundaries and the 1.2 s total are an illustration consistent with "a second or two".

export const T = {
  touch: 0,
  // card powered by the field, discovery, application selection — illustrative
  powered: 50,
  // "remove card" beep: Visa requires the contactless read in < 500 ms (FACTS §4, §5)
  cardDone: 400,
  acquirer: 600,
  network: 700,
  issuerIn: 800,
  // issuer's decision; fraud scoring itself takes < 1 ms (Visa) / < 50 ms (Mastercard) (FACTS §10)
  decision: 900,
  // whole round trip: officially only "a second or two" (FACTS §11) — 1.2 s is illustrative
  total: 1200,
} as const;

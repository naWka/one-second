import { content } from '../content';
import { FEES, rate, type RegionKey } from '../data/fees';

// The "who earned what" calculator. All rates live in src/data/fees.ts.

const num = (v: number, digits: number) =>
  v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (v: number, cur: string, digits = 2) => `${v < 0 ? '−' : ''}${num(Math.abs(v), digits)} ${cur}`;
const pct = (v: number) => `${v < 0 ? '−' : ''}${num(Math.abs(v) * 100, 1)}%`;

export function initFees(opts: { replay: () => void }) {
  const root = document.querySelector<HTMLElement>('[data-calc]');
  document.querySelector('[data-replay]')?.addEventListener('click', opts.replay);
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>('#calc-amount')!;
  const cur = root.querySelector<HTMLElement>('[data-cur]')!;
  const merchant = root.querySelector<HTMLElement>('[data-merchant]')!;
  const total = root.querySelector<HTMLElement>('[data-total]')!;
  const explain = root.querySelector<HTMLElement>('[data-explain]')!;
  const merchantBar = root.querySelector<HTMLElement>('[data-merchant-bar]')!;
  const feeBar = root.querySelector<HTMLElement>('[data-fee-bar]')!;
  const zoomLabel = root.querySelector<HTMLElement>('[data-zoom-label]')!;
  const lead = document.querySelector<HTMLElement>('[data-lead]');
  const f = content.fees;

  const render = () => {
    const region = (root.querySelector<HTMLInputElement>('input[name="region"]:checked')?.value ?? 'eu-debit') as RegionKey;
    const cfg = FEES[region];
    const raw = Number(String(input.value).replace(',', '.'));
    const amount = Number.isFinite(raw) && raw >= 0.5 ? Math.min(raw, 100000) : 5;
    cur.textContent = cfg.symbol;

    const ic = rate(cfg.interchange, amount);
    const scheme = rate(cfg.scheme, amount);
    const fees = Math.min(rate(cfg.total, amount), amount);
    const parts = { interchange: ic, scheme, acquirer: fees - ic - scheme };
    const keep = amount - fees;
    merchant.textContent = money(keep, cfg.symbol);
    total.textContent = `${money(fees, cfg.symbol, 3)} · ${pct(fees / amount)}`;

    const positive = Math.max(1e-9, ic + scheme + Math.max(0, parts.acquirer));
    for (const key of ['interchange', 'scheme', 'acquirer'] as const) {
      const row = root.querySelector<HTMLElement>(`[data-part="${key}"]`)!;
      const value = parts[key];
      row.querySelector<HTMLElement>('[data-val]')!.textContent = money(value, cfg.symbol, 3);
      row.querySelector<HTMLElement>('[data-pct]')!.textContent = pct(value / amount);
      const tag = row.querySelector<HTMLElement>('[data-tag]')!;
      if (key === 'acquirer') {
        tag.textContent = value < 0 ? `${f.kinds.estimate} · ${f.negative}` : `${f.kinds.estimate} · ${f.parts.acquirer.toLowerCase()} = итог − interchange − сбор сети`;
      } else {
        const r = cfg[key];
        tag.textContent = `${f.kinds[r.kind]} · ${r.source}`;
      }
      tag.classList.toggle('is-cap', key !== 'acquirer' && cfg[key].kind !== 'estimate');
      row.classList.toggle('is-negative', value < 0);
      const bar = root.querySelector<HTMLElement>(`[data-zoom="${key}"]`)!;
      bar.style.height = `${(Math.max(0, value) / positive) * 100}%`;
    }
    const share = fees / amount;
    merchantBar.style.height = `${(1 - share) * 100}%`;
    feeBar.style.height = `${share * 100}%`;
    zoomLabel.textContent = `лупа ×${Math.max(1, Math.round(1 / share))}`;
    explain.textContent = f[cfg.explain];
    if (lead) lead.textContent = f.lead.replace('5', `${num(amount, amount % 1 ? 2 : 0)} ${cfg.symbol}`);
  };

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  input.addEventListener('blur', () => {
    const v = Number(String(input.value).replace(',', '.'));
    if (!Number.isFinite(v) || v < 0.5) input.value = '5';
    render();
  });
  render();
}

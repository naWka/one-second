// Builds the page's HTML from the content file at build time (see vite.config.ts),
// so every word is in the static HTML: readable without WebGL, indexable,
// and available to screen readers. Pure string functions, no DOM.
import type { Content, SceneCopy } from '../content/index.ts';
import { sources } from '../content/sources.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function steps(scene: SceneCopy) {
  return scene.steps
    .map(
      (st, k) =>
        `<div class="step${st.kind ? ` step-${st.kind}` : ''}" style="--at:${st.at}" data-step="${k}"><p>${st.html}</p></div>`,
    )
    .join('');
}

function cover(c: Content) {
  return `
<section class="scene scene-cover" id="${c.scenes[0].id}" data-scene="0" style="--screens:${c.scenes[0].screens}">
  <div class="cover">
    <h1 class="cover-title">${c.cover.title}</h1>
    <p class="cover-lead">${c.cover.lead}</p>
  </div>
  <p class="cover-hint"><span class="cover-hint-line" aria-hidden="true"></span>${c.cover.hint}</p>
</section>`;
}

function fees(c: Content) {
  const f = c.fees;
  const scene = c.scenes[8];
  const regionButtons = Object.entries(f.regions)
    .map(
      ([key, label], k) =>
        `<label class="seg"><input type="radio" name="region" value="${key}"${k === 0 ? ' checked' : ''}><span>${label}</span></label>`,
    )
    .join('');
  const rows = (['interchange', 'scheme', 'acquirer'] as const)
    .map(
      (key) => `
        <li class="fee-row fee-${key}" data-part="${key}">
          <span class="fee-swatch" aria-hidden="true"></span>
          <span class="fee-name">${f.parts[key]}</span>
          <span class="fee-tag" data-tag></span>
          <span class="fee-val" data-val>—</span>
          <span class="fee-pct" data-pct></span>
        </li>`,
    )
    .join('');
  const src = sources
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>${s.note ? ` <span class="src-note">— ${esc(s.note)}</span>` : ''}</li>`,
    )
    .join('');
  return `
<section class="scene scene-fees" id="${scene.id}" data-scene="8">
  <div class="fees">
    <h2 class="fees-title">${f.title}</h2>
    <p class="fees-lead" data-lead>${f.lead}</p>
    <div class="calc" data-calc>
      <div class="calc-controls">
        <label class="calc-amount">
          <span class="calc-label">${f.amountLabel}</span>
          <span class="calc-input"><input id="calc-amount" type="number" inputmode="decimal" min="0.5" max="5000" step="0.5" value="5"><span class="calc-cur" data-cur>€</span></span>
        </label>
        <fieldset class="calc-region">
          <legend class="calc-label">${f.regionLabel}</legend>
          <div class="segs">${regionButtons}</div>
        </fieldset>
      </div>
      <div class="calc-viz">
        <div class="stack" aria-hidden="true">
          <div class="stack-cup">
            <div class="stack-merchant" data-merchant-bar></div>
            <div class="stack-fee" data-fee-bar></div>
          </div>
          <div class="stack-zoom">
            <div class="zoom-bars">
              <div class="zoom-bar zoom-interchange" data-zoom="interchange"></div>
              <div class="zoom-bar zoom-scheme" data-zoom="scheme"></div>
              <div class="zoom-bar zoom-acquirer" data-zoom="acquirer"></div>
            </div>
            <span class="zoom-label" data-zoom-label></span>
          </div>
        </div>
        <div class="calc-table">
          <p class="merchant-line"><span class="fee-name">${f.parts.merchant}</span><span class="merchant-val" data-merchant>—</span></p>
          <ul class="fee-rows">${rows}</ul>
          <p class="total-line"><span>${f.totalFee}</span><span data-total>—</span></p>
        </div>
      </div>
      <p class="calc-explain" data-explain></p>
      <p class="calc-disclaimer">${f.disclaimer}</p>
    </div>
    <div class="fees-actions">
      <button class="replay" type="button" data-replay><span class="replay-icon" aria-hidden="true"></span>${f.replay}</button>
    </div>
    <details class="sources">
      <summary>${f.sourcesTitle}</summary>
      <p class="sources-note">${f.sourcesNote}</p>
      <ol>${src}</ol>
    </details>
    <p class="footer-note">${c.footer.note}</p>
  </div>
</section>`;
}

function overlays(c: Content) {
  const m = c.message;
  const fields = m.fields
    .map(
      (f, k) =>
        `<div class="msg-row" data-row="${k}"><dt>${f.label}</dt><dd><span class="msg-val">${f.value}</span>${f.note ? `<span class="msg-note">${f.note}</span>` : ''}</dd></div>`,
    )
    .join('');
  const b = c.bank;
  const feats = b.features
    .map(
      (f, k) =>
        `<li class="feat" data-feat="${k}"><span class="feat-dot" aria-hidden="true"></span><span class="feat-label">${f.label}</span><span class="feat-ok">${f.ok}</span></li>`,
    )
    .join('');
  const panDigits = c.network.pan
    .split('')
    .map((ch) => (ch === ' ' ? '<span class="pan-gap"> </span>' : `<span class="pan-d">${ch}</span>`))
    .join('');
  return `
<div class="ov ov-message" data-ov="3">
  <p class="ov-kicker">${m.title}</p>
  <dl class="msg">${fields}</dl>
</div>
<div class="ov ov-bin" data-ov="4">
  <p class="ov-kicker">${c.network.binTitle}</p>
  <p class="pan" aria-label="${c.network.pan}">${panDigits}</p>
  <p class="ov-note">${c.network.binNote}</p>
</div>
<div class="ov ov-risk" data-ov="5">
  <div class="risk-head">
    <p class="ov-kicker">${b.gaugeTitle}</p>
    <div class="gauge" aria-hidden="true">
      <svg viewBox="0 0 200 112" class="gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#3DDC97"/>
            <stop offset="0.55" stop-color="#FFB547"/>
            <stop offset="1" stop-color="#FF4D8D"/>
          </linearGradient>
        </defs>
        <path d="M16 100 A84 84 0 0 1 184 100" fill="none" stroke="#0E1424" stroke-width="12" stroke-linecap="round"/>
        <path d="M16 100 A84 84 0 0 1 184 100" fill="none" stroke="url(#gaugeGrad)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
        <g class="gauge-needle"><line x1="100" y1="100" x2="100" y2="30" stroke="#E8ECF4" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="100" r="6" fill="#E8ECF4"/></g>
      </svg>
      <div class="gauge-scale"><span>${b.low}</span><span>${b.high}</span></div>
    </div>
  </div>
  <ul class="feats">${feats}<li class="feat feat-whatif" data-feat="whatif"><span class="feat-dot" aria-hidden="true"></span><span class="feat-label">${b.whatIfFeature}</span><span class="feat-ok">!</span></li></ul>
  <label class="whatif">
    <input type="checkbox" data-whatif>
    <span class="whatif-switch" aria-hidden="true"></span>
    <span class="whatif-text"><span class="whatif-title">${b.whatIf}</span><span class="whatif-option">${b.whatIfOption}</span></span>
  </label>
  <p class="verdict" data-verdict aria-live="polite"><span class="verdict-code" data-code>${b.codeApproved}</span><span class="verdict-text" data-verdict-text>${b.approved}</span></p>
</div>
<div class="ov ov-approved" data-ov="6" aria-hidden="true">
  <p class="approved">${c.approved.title}</p>
</div>
<div class="ov ov-settle" data-ov="7" aria-hidden="true">
  <div class="settle-scale">${c.settle.scale.map((s, k) => `<span data-scale="${k}">${s}</span>`).join('')}</div>
</div>`;
}

export function renderStory(c: Content) {
  const sections = c.scenes
    .map((scene, i) => {
      if (i === 0) return cover(c);
      if (i === c.scenes.length - 1) return fees(c);
      return `
<section class="scene" id="${scene.id}" data-scene="${i}" style="--screens:${scene.screens}">
  <h2 class="sr-only">${scene.heading}</h2>
  ${steps(scene)}
</section>`;
    })
    .join('');

  const rail = c.scenes
    .slice(1)
    .map(
      (s, k) =>
        `<li><button type="button" class="rail-btn" data-goto="${k + 1}" aria-label="${c.hud.goTo}: ${s.stage}"><span class="rail-dot" aria-hidden="true"></span><span class="rail-label">${s.stage}</span></button></li>`,
    )
    .join('');

  return `
<a class="skip-link" href="#${c.scenes[8].id}">${c.hud.skip}</a>
<canvas id="gl" aria-hidden="true"></canvas>
<div id="labels" aria-hidden="true"></div>
<div class="hud-shade" aria-hidden="true"></div>
<div class="rewind" aria-hidden="true"><span class="rewind-icon"></span>${c.hud.rewind}</div>
<div id="overlays">${overlays(c)}</div>
<header class="hud" aria-label="${c.hud.timerLabel}">
  <p class="hud-kicker">${c.hud.timerLabel}</p>
  <p class="hud-time" data-time>00:00.000</p>
  <p class="hud-badge" data-badge><span data-badge-label>${c.hud.realtime}</span> <span class="hud-factor" data-factor>×1</span></p>
</header>
<nav class="rail" aria-label="${c.hud.railAria}"><ol>${rail}</ol></nav>
<button class="sound" type="button" aria-pressed="false" aria-label="${c.hud.soundAria}" data-sound>
  <span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  <span class="sound-label" data-sound-label>${c.hud.soundOff}</span>
</button>
<main id="story">${sections}
</main>`;
}

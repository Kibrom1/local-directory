// Fee table: rent illustration and compare mode. The table is complete and readable without JavaScript.
import { estimateText } from '../lib/estimate.mjs';

const tb = document.getElementById('fee-table');
if (tb) {
  const rows = [...tb.querySelectorAll('tbody tr')];
  const boxes = [...tb.querySelectorAll('input[type=checkbox]')];
  const msg = document.getElementById('compare-msg');
  const show = document.getElementById('show-selected');
  const reset = document.getElementById('show-all');
  const rent = document.getElementById('rent');
  const out = [...tb.querySelectorAll('[data-est]')];
  const est = () => {
    const r = parseFloat(rent.value);
    for (const el of out) el.textContent = estimateText(JSON.parse(el.dataset.est), r);
  };
  if (rent && out.length) { rent.addEventListener('input', est); est(); }
  const sync = (changed) => {
    let n = boxes.filter((b) => b.checked).length;
    if (n > 3 && changed) { changed.checked = false; n = 3; msg.textContent = 'You can compare up to 3 companies. Uncheck one first.'; }
    else msg.textContent = `${n} selected (choose 2 or 3).`;
    show.disabled = n < 2;
    show.setAttribute('aria-disabled', String(n < 2));
  };
  if (show && msg) {
    for (const b of boxes) b.addEventListener('change', () => sync(b));
    sync(null);
    show.addEventListener('click', () => {
      for (const r of rows) { const b = r.querySelector('input[type=checkbox]'); r.hidden = !(b && b.checked); }
      reset.hidden = false;
      msg.textContent = 'Showing only your selected companies.';
    });
    reset.addEventListener('click', () => {
      for (const r of rows) r.hidden = false;
      reset.hidden = true;
      msg.textContent = 'Showing all companies.';
    });
  }
}

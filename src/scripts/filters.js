// City results filters: property type and "only companies that publish fees". Toggles `hidden` on cards; the full list works without JS.
const f = document.getElementById('filters');
if (f) {
  const rows = [...document.querySelectorAll('[data-types]')];
  const count = document.getElementById('count');
  const empty = document.getElementById('empty-state');
  const apply = () => {
    const pt = f.elements.type.value, fe = f.elements.fees.checked;
    let n = 0;
    for (const r of rows) {
      const ok = (!pt || r.dataset.types.split(' ').includes(pt)) && (!fe || r.dataset.fees === 'yes');
      r.hidden = !ok;
      if (ok) n += 1;
    }
    count.textContent = `${n} ${n === 1 ? 'company' : 'companies'} shown`;
    if (empty) empty.hidden = n > 0;
  };
  f.addEventListener('change', apply);
  f.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  const q = new URLSearchParams(location.search).get('type');
  if (q && [...f.elements.type.options].some((o) => o.value === q)) f.elements.type.value = q;
  apply();
}

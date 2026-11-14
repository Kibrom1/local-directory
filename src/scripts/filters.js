// City results filters. Property type GROUPS companies instead of hiding them: a company with no stated property type is not
// "someone who does not serve you", it is a company we have no fact for. "Only companies that publish fees" is an explicit hide.
// The full list works without JavaScript.
const f = document.getElementById('filters');
if (f) {
  const list = document.getElementById('results');
  const groupsBox = document.getElementById('groups');
  const cards = [...document.querySelectorAll('[data-types]')];
  cards.forEach((c, i) => { c.dataset.i = String(i); });
  const count = document.getElementById('count');
  const empty = document.getElementById('empty-state');
  const slot = { match: document.getElementById('g-match'), unstated: document.getElementById('g-unstated'), other: document.getElementById('g-other') };
  const put = (ul, items) => { items.sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i)).forEach((c) => ul.appendChild(c)); };
  const apply = () => {
    const pt = f.elements.type.value, fe = f.elements.fees.checked;
    const label = f.elements.type.selectedOptions[0] ? f.elements.type.selectedOptions[0].textContent : '';
    const shown = cards.filter((c) => !fe || c.dataset.fees === 'yes');
    cards.forEach((c) => { c.hidden = !shown.includes(c); });
    const g = { match: [], unstated: [], other: [] };
    for (const c of shown) {
      const t = c.dataset.types.split(' ').filter(Boolean);
      if (pt && t.includes(pt)) g.match.push(c);
      else if (pt && t.length === 0) g.unstated.push(c);
      else if (pt) g.other.push(c);
    }
    if (!pt) { put(list, [...cards]); list.hidden = false; groupsBox.hidden = true; }
    else {
      list.hidden = true; groupsBox.hidden = false;
      for (const k of ['match', 'unstated', 'other']) {
        put(slot[k], g[k]);
        document.getElementById(`${k}-head`).hidden = g[k].length === 0;
        document.getElementById(`${k}-head-n`).textContent = String(g[k].length);
        slot[k].hidden = g[k].length === 0;
      }
      document.getElementById('match-head-t').textContent = label;
    }
    const n = shown.length;
    count.textContent = pt
      ? `${n} ${n === 1 ? 'company' : 'companies'} shown in groups: ${g.match.length} say they serve ${label}, ${g.unstated.length} have no property type stated, ${g.other.length} state other types.`
      : `${n} ${n === 1 ? 'company' : 'companies'} shown`;
    if (empty) empty.hidden = n > 0;
  };
  f.addEventListener('change', apply);
  f.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  const q = new URLSearchParams(location.search).get('type');
  if (q && [...f.elements.type.options].some((o) => o.value === q)) f.elements.type.value = q;
  apply();
}

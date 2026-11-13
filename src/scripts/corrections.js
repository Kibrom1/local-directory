// Correct / add / remove form: prefill from the query string, hide fact fields for removal, show an error summary.
// The form posts natively to the hosted form tool (PUBLIC_FORM_ACTION) once it passes these checks; without JavaScript the browser's own required/type checks apply.
const f = document.getElementById('correct-form');
if (f) {
  f.noValidate = true;
  const p = new URLSearchParams(location.search);
  const t = p.get('type');
  if (t) for (const r of f.elements.rtype) if (r.value === t) r.checked = true;
  if (p.get('company')) f.elements.company.value = p.get('company');
  const facts = document.getElementById('fact-fields');
  const sync = () => {
    const remove = f.elements.rtype.value === 'remove';
    facts.hidden = remove;
    for (const el of facts.querySelectorAll('input,textarea')) el.disabled = remove;
  };
  f.addEventListener('change', sync);
  sync();
  const summary = document.getElementById('error-summary');
  const list = document.getElementById('error-list');
  const rules = [
    ['company', 'Enter the company name or the page address.', (el) => el.value.trim() !== ''],
    ['evidence', 'Enter a link starting with https:// that shows the correct fact.', (el) => el.value.trim() !== '' && el.checkValidity()],
    ['requester_email', 'Enter your email, like name@company.com.', (el) => el.value.trim() !== '' && el.checkValidity()]
  ];
  f.addEventListener('submit', (e) => {
    const remove = f.elements.rtype.value === 'remove';
    list.textContent = '';
    let first = null;
    for (const [name, text, ok] of rules) {
      const el = f.elements[name];
      const err = document.getElementById(`${name}-err`);
      const skip = remove && name === 'evidence';
      const good = skip || ok(el);
      err.hidden = good;
      el.setAttribute('aria-invalid', String(!good));
      if (!good) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${name}`; a.textContent = text;
        li.appendChild(a); list.appendChild(li);
        first = first || el;
      }
    }
    if (first) { e.preventDefault(); summary.hidden = false; summary.focus(); }
    else summary.hidden = true;
  });
}

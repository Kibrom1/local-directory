// Mobile menu. Without JavaScript the nav list is simply visible.
const t = document.querySelector('.nav-toggle');
const l = document.getElementById('nav-list');
if (t && l) {
  const set = (open) => { l.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open)); };
  t.addEventListener('click', () => set(!l.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && l.classList.contains('open')) { set(false); t.focus(); } });
}

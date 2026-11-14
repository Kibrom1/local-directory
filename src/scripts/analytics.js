// Aggregate usage events (privacy page lists them). Sent only when GA4 is configured (window.gtag exists).
// No event carries text a visitor typed, a company name, a URL or an identifier.
const send = (name) => { if (typeof window.gtag === 'function') window.gtag('event', name); };
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (a && a.origin !== location.origin) send('source_link_click');
  if (e.target.closest && e.target.closest('#show-selected')) send('fee_compare_used');
});
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'rent') send('rent_example_changed'); }, { once: true });
document.addEventListener('submit', (e) => { const f = e.target; if (f && f.getAttribute && f.getAttribute('role') === 'search') send('site_search_used'); });

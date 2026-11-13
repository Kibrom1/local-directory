// Mobile menu. Without JavaScript the nav list is simply visible.
const t = document.querySelector('.nav-toggle');
const l = document.getElementById('nav-list');
if (t && l) t.addEventListener('click', () => { const open = l.classList.toggle('open'); t.setAttribute('aria-expanded', String(open)); });

// Home page "find a company" form: sends the visitor to /city/<slug>/?type=<slug>. Without JavaScript the city list below it works.
const f = document.getElementById('find-form');
if (f) f.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = f.elements.city.value;
  const type = f.elements.type.value;
  location.href = `/city/${encodeURIComponent(city)}/${type ? `?type=${encodeURIComponent(type)}` : ''}`;
});

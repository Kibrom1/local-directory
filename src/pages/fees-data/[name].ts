import type { APIRoute } from 'astro';
import { getSite } from '../../lib/site.mjs';
import { exportRows, toCsv, toJson } from '../../lib/export.mjs';
// Downloads exist only when the fee comparison page does (same quality gate), so they are never published for thin data.
const FILES = ['columbus-pm-fees.csv', 'columbus-pm-fees.json'];
export function getStaticPaths() {
  const s = getSite();
  return s.planned.find((p) => p.type === 'fee-comparison').eligible ? FILES.map((name) => ({ params: { name } })) : [];
}
export const GET: APIRoute = ({ params }) => {
  const s = getSite();
  const rows = exportRows(s);
  return params.name.endsWith('.csv')
    ? new Response(toCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
    : new Response(toJson(s, rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};

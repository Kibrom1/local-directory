// Example adapter. It targets the fixture page in tests/fixtures/example-company.html
// (not a real site). It shows the contract: parse({ html, url }) returns raw facts only;
// the pipeline sanitizes them and never stores prose or images.
const text = (html, cls) => { const m = html.match(new RegExp(`<[a-z0-9]+[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</[a-z0-9]+>`, 'i')); return m ? m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : null; };
const num = (s) => { const m = s && s.match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };

export default {
  id: 'example-fixture',
  match: (url) => /example-pm\.test$/.test(new URL(url).hostname),
  parse({ html, url }) {
    const origin = new URL(url).origin;
    const addr = (text(html, 'address') || '').match(/^(.*?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})$/);
    const mgmt = num(text(html, 'fee-management'));
    const leasing = num(text(html, 'fee-leasing'));
    const renewal = num(text(html, 'fee-renewal'));
    const areas = [...html.matchAll(/<li[^>]*class="area"[^>]*>([^<]+)<\/li>/g)].map((m) => m[1].trim());
    return {
      company: { name: text(html, 'company-name'), website: origin, phone: text(html, 'phone'), address: addr ? { street: addr[1], city: addr[2], state: addr[3], zip: addr[4] } : {}, bio: text(html, 'about') },
      service_areas: areas,
      fees: [{
        property_type: null, source_url: url,
        management_pct: mgmt !== null ? { type: 'pct_of_rent', value: mgmt } : null,
        leasing_fee: leasing !== null ? { type: 'pct_of_monthly_rent', period: 'one_time', value: leasing, basis: "first month's rent" } : null,
        renewal_fee: renewal !== null ? { type: 'flat_usd', period: 'one_time', value: renewal } : null,
        flat_fee: null, minimums: null
      }]
    };
  }
};

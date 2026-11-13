# Phase 2 option: home services by suburb (short pass, pivot-informing only)

Research date: 2026-11-11. Data here is thin; treat as directional.

## Demand
- No Columbus or suburb volumes found. National measured/aggregated points, none with a clean source: SEOJuice "Home Services" page (US, updated 2026-01-28): "plumbing services near me" 49,500; "local plumber" 22,200; "roofing repair" 90,500; "roof inspections" 18,100 (https://seojuice.com/keyword-research/real-estate/Home-Services/US/). Hook Agency table (undated data, mixed timeframes, source not named; article updated 2025-11-05) lists pest control 113,000, landscaping 70,000, plumbing 60K, cleaning 51,000, roofing 46,000, HVAC 38,000 (https://hookagency.com/blog/most-searched-home-services/).
- Proxy reasoning: home-service intent is far larger than property-management intent (national plumbing and roofing terms are in the tens of thousands vs 110,000 for the whole "property management" head term). Per-suburb demand for each trade would plausibly exceed the PM suburb figures by an order of magnitude, but that is an estimate with no Columbus measurement. Needs a Keyword Planner pull.

## Competition (query "plumber Dublin OH", search tool order, 2026-11-11)
Top results: benjaminfranklinplumbing.com (company), thisoldhouse.com/near-me (directory), angi.com, thumbtack.com, homeadvisor.com, homeguide.com, rotorooter.com, mrrooter.com, ars.com, BBB, Yellow Pages, Superpages. Mix of very-high-authority marketplaces (Angi, Thumbtack, HomeAdvisor, This Old House, BBB, Yellow Pages) and national franchises. Harder SERP than property management; local franchise sites also rank.

## Data availability
- Ohio licenses electrical, HVAC and plumbing contractors (per the Apify listing title; other trades not verified) through the Ohio Construction Industry Licensing Board (OCILB). Public verification exists (state eLicense lookup; a news item cites about 10,600 licensed contractors, https://www.hometownstations.com/news/online-tool-allows-commercial-entities-to-verify-contractors-are-among-10-600-in-ohio/article_26e93cb8-54dd-11ef-88b2-1f7cc4cdee79.html, low confidence, snippet only). Third-party scrapers of the OCILB data exist (Apify actor), which suggests bulk access is feasible but **terms and robots for the state system were not reviewed** and must be checked per the brief.
- Pricing is quote-based and job-specific, so the "structured fee data" differentiator that works for PM (percent/flat fee rows) is much weaker here. Licence status and service area would be the unique data.

## Monetization and rule fit
Home-services directories earn almost entirely from pay-per-lead, quote marketplaces, and sponsored placement (Angi, Thumbtack, HomeAdvisor model; Thumbtack and Awning-type lead forms observed 2026-11-11). **That model is exactly what the no-payments / no-lead-gen rules prohibit**, so a free no-revenue home-services directory would compete head-on with marketplaces that have far stronger domains and no traffic-value path for you.

## Assessment
Larger demand, but a harder SERP, weaker structured-data differentiator, more per-trade fragmentation (many trades x many suburbs, higher risk of templated thin pages), and the same monetization constraint. Better as a later extension of the same licensed-contractor/public-records approach for one narrow trade than as a wholesale pivot. Before deciding, get Keyword Planner data for 5 trades x 5 suburbs and review OCILB terms.

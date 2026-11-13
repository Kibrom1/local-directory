// Per-fee-type guide content that is not data: names, one-sentence definitions and questions to ask a company.
// Everything numeric on a guide page comes from data/. Wording here is general, carries no figures and is not legal advice.
export const FEE_GUIDES = {
  management_pct: {
    slug: 'management-fee', name: 'Management fee (percent of rent)', short: 'Management fee',
    title: 'Management fees: what Columbus managers publish',
    definition: 'The management fee is the recurring charge a company takes for managing a rental. Some companies state it as a percent of rent, which is what this guide covers.',
    questions: ['Is the percent taken from rent collected or rent billed?', 'Is there a minimum monthly amount, and when does it apply?', 'Which services are included in the percent, and which cost extra?', 'Does the percent change with the number of units or the plan?']
  },
  flat_fee: {
    slug: 'flat-fee', name: 'Flat management fee', short: 'Flat fee',
    title: 'Flat management fees: what Columbus managers publish',
    definition: 'A flat management fee is a fixed dollar amount charged on a schedule, usually monthly, instead of a percent of rent.',
    questions: ['Is the amount per unit or per account?', 'Does the amount change with the number of homes or the plan?', 'What is not included in the flat amount?']
  },
  leasing_fee: {
    slug: 'leasing-fee', name: 'Leasing fee', short: 'Leasing fee',
    title: 'Leasing fees: what Columbus managers publish',
    definition: 'A leasing fee is a one-time charge for finding and placing a tenant. Companies state it as a percent of one month\'s rent or as a flat amount.',
    questions: ['Is the fee a percent of the first month\'s rent, and is there a dollar minimum?', 'What does it cover: marketing, showings, screening, the lease?', 'Is any part refunded if the tenant leaves early?', 'Is there a different leasing fee if I only want leasing and not ongoing management?']
  },
  renewal_fee: {
    slug: 'renewal-fee', name: 'Renewal fee', short: 'Renewal fee',
    title: 'Renewal fees: what Columbus managers publish',
    definition: 'A renewal fee is charged when a tenant\'s lease is renewed. Companies state it as a flat amount or as a percent of one month\'s rent.',
    questions: ['Is the fee charged every renewal or only some?', 'Does it include a rent review and the new lease paperwork?', 'Is it different for month-to-month tenants?']
  }
};
export const feeTypeBySlug = (slug) => Object.keys(FEE_GUIDES).find((k) => FEE_GUIDES[k].slug === slug);

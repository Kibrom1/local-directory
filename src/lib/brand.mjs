// The public name of the site, in one place. Change it here or set PUBLIC_SITE_NAME in .env / the host's environment variables.
// (Titles, header, footer, structured data and the fee-data export all read this.)
const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_SITE_NAME) || (typeof process !== 'undefined' && process.env && process.env.PUBLIC_SITE_NAME);
export const SITE_NAME = (fromEnv && String(fromEnv).trim()) || 'Central Ohio Property Management Guide';

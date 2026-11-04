// Shared Plaid helper. Files starting with "_" are not exposed as Vercel routes.
// Set PLAID_ENV to "production" in Vercel to link real accounts (default: sandbox test data).
const HOSTS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};
export const PLAID_ENV = (process.env.PLAID_ENV || 'sandbox').toLowerCase();

export async function plaid(path, body = {}) {
  const resp = await fetch(`${HOSTS[PLAID_ENV] || HOSTS.sandbox}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, ...body }),
  });
  const data = await resp.json();
  return { ok: resp.ok, data };
}

import { plaid } from './_plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { access_token } = req.body || {};
  try {
    const body = {
      client_name: 'ASCEND',
      country_codes: ['US'],
      language: 'en',
      user: { client_user_id: 'ascend-user' },
    };
    if (access_token) {
      // Update mode: re-open Link for an existing connection to grant card details (limits, APR, due dates)
      body.access_token = access_token;
      body.additional_consented_products = ['liabilities'];
    } else {
      body.products = ['transactions'];
      // Card limits, APRs, minimum payments, statement & due dates — requested when the institution supports it
      body.optional_products = ['liabilities'];
    }
    const { ok, data } = await plaid('/link/token/create', body);
    if (!ok) return res.status(400).json({ error: data.error_message || 'Plaid error' });
    res.json({ link_token: data.link_token });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

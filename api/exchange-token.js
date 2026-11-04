import { plaid } from './_plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { public_token } = req.body || {};
  try {
    const { ok, data } = await plaid('/item/public_token/exchange', { public_token });
    if (!ok) return res.status(400).json({ error: data.error_message });
    res.json({ access_token: data.access_token, item_id: data.item_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

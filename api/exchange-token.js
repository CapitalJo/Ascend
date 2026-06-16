export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { public_token } = req.body;
  try {
    const response = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        public_token,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.error_message });
    res.json({ access_token: data.access_token, item_id: data.item_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
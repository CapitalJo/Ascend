export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const response = await fetch('https://sandbox.plaid.com/link/token/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        client_name: 'ASCEND',
        country_codes: ['US'],
        language: 'en',
        user: { client_user_id: 'ascend-user' },
        products: ['transactions', 'auth'],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.error_message || 'Plaid error' });
    res.json({ link_token: data.link_token });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
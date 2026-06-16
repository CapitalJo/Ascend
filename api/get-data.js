export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { access_token } = req.body;
  try {
    // Get accounts
    const acctResp = await fetch('https://sandbox.plaid.com/accounts/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, access_token }),
    });
    const acctData = await acctResp.json();
 
    // Get transactions (last 90 days)
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 90*86400000).toISOString().split('T')[0];
    const txnResp = await fetch('https://sandbox.plaid.com/transactions/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.PLAID_CLIENT_ID, secret: process.env.PLAID_SECRET, access_token, start_date: start, end_date: end, options: { count: 250 } }),
    });
    const txnData = await txnResp.json();
 
    res.json({
      accounts: (acctData.accounts||[]).map(a => ({
        id: a.account_id, name: a.name, institution: a.official_name||a.name,
        balance: a.balances.current, type: a.type, subtype: a.subtype,
      })),
      transactions: (txnData.transactions||[]).map(t => ({
        id: t.transaction_id, date: t.date, description: t.name,
        amount: -t.amount, // Plaid uses positive for debits
        category: mapCategory(t.category), type: t.amount > 0 ? 'expense' : 'income',
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
 
function mapCategory(cats) {
  if (!cats || !cats.length) return 'Other';
  const c = cats[0].toLowerCase();
  if (c.includes('food') || c.includes('restaurant') || c.includes('dining')) return 'Dining';
  if (c.includes('grocer')) return 'Groceries';
  if (c.includes('travel') || c.includes('transport') || c.includes('gas') || c.includes('auto')) return 'Transportation';
  if (c.includes('rent') || c.includes('mortgage') || c.includes('housing')) return 'Housing';
  if (c.includes('subscription') || c.includes('service')) return 'Subscriptions';
  if (c.includes('medical') || c.includes('health') || c.includes('pharma')) return 'Healthcare';
  if (c.includes('entertainment') || c.includes('recreation')) return 'Entertainment';
  if (c.includes('income') || c.includes('payroll') || c.includes('deposit')) return 'Income';
  if (c.includes('transfer')) return 'Transfer';
  return 'Other';
}
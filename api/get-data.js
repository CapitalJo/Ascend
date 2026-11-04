import { plaid } from './_plaid.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { access_token } = req.body || {};
  try {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 90*86400000).toISOString().split('T')[0];
    const [acct, txn, liab] = await Promise.all([
      plaid('/accounts/get', { access_token }),
      plaid('/transactions/get', { access_token, start_date: start, end_date: end, options: { count: 250 } }),
      plaid('/liabilities/get', { access_token }),
    ]);
    if (!acct.ok) return res.status(400).json({ error: acct.data.error_message || 'Could not load accounts', code: acct.data.error_code });

    // Card / loan details keyed by account_id. Missing if the bank doesn't share them or consent wasn't granted.
    const details = {};
    const L = liab.ok ? liab.data.liabilities || {} : {};
    (L.credit || []).forEach(c => {
      const purchase = (c.aprs || []).find(a => a.apr_type === 'purchase_apr') || (c.aprs || [])[0];
      details[c.account_id] = {
        apr: purchase ? purchase.apr_percentage : null,
        minPayment: c.minimum_payment_amount ?? null,
        nextDueDate: c.next_payment_due_date || null,
        lastStatementDate: c.last_statement_issue_date || null,
        lastStatementBalance: c.last_statement_balance ?? null,
        closeDay: c.last_statement_issue_date ? parseInt(c.last_statement_issue_date.slice(8, 10)) : null,
        isOverdue: !!c.is_overdue,
      };
    });
    (L.student || []).forEach(s => {
      details[s.account_id] = { apr: s.interest_rate_percentage ?? null, minPayment: s.minimum_payment_amount ?? null, nextDueDate: s.next_payment_due_date || null, isOverdue: !!s.is_overdue };
    });
    (L.mortgage || []).forEach(m => {
      details[m.account_id] = { apr: m.interest_rate?.percentage ?? null, minPayment: m.next_monthly_payment ?? null, nextDueDate: m.next_payment_due_date || null, isOverdue: (m.past_due_amount || 0) > 0 };
    });

    res.json({
      accounts: (acct.data.accounts||[]).map(a => ({
        id: a.account_id, name: a.name, institution: a.official_name||a.name,
        balance: a.balances.current, limit: a.balances.limit ?? null,
        type: a.type === 'credit' ? 'credit' : a.type === 'loan' ? 'loan' : a.type === 'investment' ? 'investment' : (a.subtype === 'savings' ? 'savings' : 'checking'),
        subtype: a.subtype,
        ...(details[a.account_id] || {}),
      })),
      transactions: (txn.ok ? txn.data.transactions || [] : []).map(t => ({
        id: t.transaction_id, date: t.date, description: t.name,
        amount: -t.amount, // Plaid uses positive for debits
        category: mapCategory(t.category), type: t.amount > 0 ? 'expense' : 'income',
      })),
      // Tells the app whether card details came through, or the user must re-link to grant them
      liabilities: liab.ok ? 'ok' : (liab.data.error_code || 'unavailable'),
      syncedAt: new Date().toISOString(),
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
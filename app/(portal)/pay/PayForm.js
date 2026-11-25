'use client';
import { useActionState, useMemo, useState } from 'react';
import { submitPayment } from '@/app/actions/finance';

const fmt = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n || 0);

export default function PayForm({ unpaid, outstanding, voluntaryTypes }) {
  const [state, action, pending] = useActionState(submitPayment, null);
  const [purpose, setPurpose] = useState(unpaid.length ? 'dues' : 'voluntary');
  const [picked, setPicked] = useState(() => new Set(unpaid.map((u) => u.id)));
  const [amount, setAmount] = useState(unpaid.length ? String(outstanding) : '');
  const [touchedAmount, setTouchedAmount] = useState(false);

  const pickedTotal = useMemo(
    () => unpaid.filter((u) => picked.has(u.id)).reduce((s, u) => s + u.balance, 0),
    [picked, unpaid]
  );

  const toggle = (id) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
    if (!touchedAmount) {
      const total = unpaid.filter((u) => next.has(u.id)).reduce((s, u) => s + u.balance, 0);
      setAmount(total ? String(Math.round(total * 100) / 100) : '');
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="card">
      {state?.error && <div className="alert error">{state.error}</div>}

      <div className="field">
        <label>What are you paying for?</label>
        <div className="radio-group">
          <label>
            <input type="radio" name="purpose" value="dues" checked={purpose === 'dues'} onChange={() => setPurpose('dues')} />
            Dues &amp; levies I owe
          </label>
          <label>
            <input type="radio" name="purpose" value="voluntary" checked={purpose === 'voluntary'} onChange={() => setPurpose('voluntary')} />
            Contribution / donation
          </label>
        </div>
      </div>

      {purpose === 'dues' && (
        <div className="field">
          <label>Items this payment covers</label>
          {unpaid.length === 0 ? (
            <div className="alert ok">You owe nothing right now. Anything you pay as dues will be held as credit for future dues.</div>
          ) : (
            <>
              {unpaid.map((u) => (
                <label key={u.id} className="check-row">
                  <input type="checkbox" name="charges" value={u.id} checked={picked.has(u.id)} onChange={() => toggle(u.id)} />
                  <span className="grow">{u.description}</span>
                  <b>{fmt(u.balance)}</b>
                </label>
              ))}
              <div className="hint">Selected: {fmt(pickedTotal)}. If you pay more than the selected items, the extra clears your oldest other items, then becomes credit.</div>
            </>
          )}
        </div>
      )}

      {purpose === 'voluntary' && (
        <div className="field">
          <label htmlFor="payment_type_id">Contribution or donation</label>
          {voluntaryTypes.length === 0 ? (
            <div className="alert info">No voluntary contributions are open right now.</div>
          ) : (
            <select id="payment_type_id" name="payment_type_id" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {voluntaryTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.description ? ` — ${t.description}` : ''}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="grid g3" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="amount">Amount paid (₦)</label>
          <input
            id="amount" name="amount" type="number" min="1" step="0.01" required value={amount}
            onChange={(e) => { setAmount(e.target.value); setTouchedAmount(true); }}
          />
        </div>
        <div className="field">
          <label htmlFor="paid_on">Date paid</label>
          <input id="paid_on" name="paid_on" type="date" required max={today} defaultValue={today} />
        </div>
        <div className="field">
          <label htmlFor="method">How you paid</label>
          <select id="method" name="method" defaultValue="bank_transfer">
            <option value="bank_transfer">Bank transfer</option>
            <option value="pos">POS</option>
            <option value="other">Other (bank deposit, etc.)</option>
          </select>
        </div>
      </div>

      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="slip">Payment slip / receipt</label>
          <input id="slip" name="slip" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" />
          <div className="hint">Screenshot of the transfer, photo of the teller, or PDF receipt. Max 5 MB.</div>
        </div>
        <div className="field">
          <label htmlFor="reference">Transaction reference (optional)</label>
          <input id="reference" name="reference" type="text" placeholder="Session ID / teller number" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="member_note">Note to the Financial Secretary (optional)</label>
        <textarea id="member_note" name="member_note" placeholder="e.g. Paid from my wife's account, name: …" />
      </div>
      <button className="btn" disabled={pending || (purpose === 'voluntary' && voluntaryTypes.length === 0)}>
        {pending ? 'Uploading…' : 'Submit for confirmation'}
      </button>
    </form>
  );
}

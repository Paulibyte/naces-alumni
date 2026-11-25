'use client';
import { useActionState, useState } from 'react';
import { recordPayment } from '@/app/actions/finance';

export default function RecordPaymentForm({ userId, voluntaryTypes }) {
  const [state, action, pending] = useActionState(recordPayment, null);
  const [purpose, setPurpose] = useState('dues');
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action}>
      {state?.error && <div className="alert error">{state.error}</div>}
      {state?.ok && <div className="alert ok">{state.ok}</div>}
      <input type="hidden" name="user_id" value={userId} />
      <div className="field">
        <div className="radio-group">
          <label><input type="radio" name="purpose" value="dues" checked={purpose === 'dues'} onChange={() => setPurpose('dues')} /> Dues &amp; levies</label>
          <label><input type="radio" name="purpose" value="voluntary" checked={purpose === 'voluntary'} onChange={() => setPurpose('voluntary')} /> Contribution / donation</label>
        </div>
      </div>
      {purpose === 'voluntary' && (
        <div className="field">
          <select name="payment_type_id" required defaultValue="">
            <option value="" disabled>Choose type…</option>
            {voluntaryTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field"><label>Amount (₦)</label><input name="amount" type="number" min="1" step="0.01" required /></div>
        <div className="field"><label>Date received</label><input name="paid_on" type="date" max={today} defaultValue={today} required /></div>
      </div>
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field">
          <label>Method</label>
          <select name="method" defaultValue="cash">
            <option value="cash">Cash</option><option value="pos">POS</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option>
          </select>
        </div>
        <div className="field"><label>Note</label><input name="review_note" type="text" placeholder="e.g. Paid at AGM" /></div>
      </div>
      <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Record as confirmed'}</button>
    </form>
  );
}

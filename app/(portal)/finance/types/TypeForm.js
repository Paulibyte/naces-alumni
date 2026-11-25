'use client';
import { useActionState } from 'react';
import { savePaymentType } from '@/app/actions/finance';

export default function TypeForm({ type }) {
  const [state, action, pending] = useActionState(savePaymentType, null);
  return (
    <form action={action}>
      {state?.error && <div className="alert error">{state.error}</div>}
      {state?.ok && <div className="alert ok">{state.ok}</div>}
      {type && <input type="hidden" name="id" value={type.id} />}
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required defaultValue={type?.name} placeholder="e.g. End of Year Party Levy" />
      </div>
      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={type?.category || 'levy'}>
            <option value="monthly_due">Monthly dues</option>
            <option value="levy">Levy</option>
            <option value="contribution">Contribution</option>
            <option value="donation">Donation</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="billing">How it is charged</label>
          <select id="billing" name="billing" defaultValue={type?.billing || 'one_off'}>
            <option value="monthly">Billed every month</option>
            <option value="one_off">Billed once when raised</option>
            <option value="voluntary">Voluntary — members pay any time</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="default_amount">Default amount (₦)</label>
        <input id="default_amount" name="default_amount" type="number" min="0" step="0.01" defaultValue={type?.default_amount ?? ''} />
        <div className="hint">Required for monthly dues. For levies it pre-fills the billing form; leave blank for voluntary types.</div>
      </div>
      <div className="field">
        <label htmlFor="description">Description (shown to members)</label>
        <textarea id="description" name="description" defaultValue={type?.description || ''} />
      </div>
      {type && (
        <div className="field">
          <label htmlFor="active">Status</label>
          <select id="active" name="active" defaultValue={type.active ? 'true' : 'false'}>
            <option value="true">Active</option>
            <option value="false">Inactive (hidden from billing and Pay page)</option>
          </select>
        </div>
      )}
      <div className="row-actions">
        <button className="btn" disabled={pending}>{pending ? 'Saving…' : type ? 'Save changes' : 'Add payment type'}</button>
        {type && <a className="btn secondary" href="/finance/types">Cancel</a>}
      </div>
    </form>
  );
}

'use client';
import { useActionState, useState } from 'react';
import { billMembers } from '@/app/actions/finance';

const SET = { ND2005: 'ND 05', HND2008: 'HND 08', BOTH: 'ND+HND' };

export default function BillForm({ types, members }) {
  const [state, action, pending] = useActionState(billMembers, null);
  const [typeId, setTypeId] = useState(types[0]?.id ? String(types[0].id) : '');
  const [scope, setScope] = useState('all');
  const [filter, setFilter] = useState('');
  const type = types.find((t) => String(t.id) === typeId);
  const thisMonth = new Date().toISOString().slice(0, 7);

  if (types.length === 0) return <div className="card alert info">Add a monthly or one-off payment type first.</div>;

  return (
    <form
      action={action}
      className="card"
      onSubmit={(e) => {
        const n = scope === 'all' ? members.length : e.currentTarget.querySelectorAll('input[name=members]:checked').length;
        if (!confirm(`Bill ${n} member${n === 1 ? '' : 's'} for ${type?.name}?`)) e.preventDefault();
      }}
    >
      {state?.error && <div className="alert error">{state.error}</div>}
      {state?.ok && <div className="alert ok">{state.ok}</div>}

      <div className="grid g2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="payment_type_id">Payment type</label>
          <select id="payment_type_id" name="payment_type_id" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.billing === 'monthly' ? 'monthly' : 'one-off'})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amount">Amount per member (₦)</label>
          <input key={typeId} id="amount" name="amount" type="number" min="1" step="0.01" required defaultValue={type?.default_amount ?? ''} />
        </div>
      </div>

      {type?.billing === 'monthly' ? (
        <div className="grid g2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="period">Month being billed</label>
            <input id="period" name="period" type="month" required defaultValue={thisMonth} />
            <div className="hint">Members already billed for this month are skipped, so you can safely run it again for new members.</div>
          </div>
          <div className="field">
            <label htmlFor="due_date">Due date (optional)</label>
            <input id="due_date" name="due_date" type="date" />
          </div>
        </div>
      ) : (
        <div className="grid g2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="title">What is it for?</label>
            <input id="title" name="title" type="text" required placeholder="e.g. Burial of late father of Engr. Okafor" />
          </div>
          <div className="field">
            <label htmlFor="due_date">Due date (optional)</label>
            <input id="due_date" name="due_date" type="date" />
          </div>
        </div>
      )}

      <div className="field">
        <label>Who should be billed?</label>
        <div className="radio-group">
          <label><input type="radio" name="scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} /> All verified members ({members.length})</label>
          <label><input type="radio" name="scope" value="selected" checked={scope === 'selected'} onChange={() => setScope('selected')} /> Selected members only</label>
        </div>
      </div>

      {scope === 'selected' && (
        <div className="field">
          <input type="text" placeholder="Search members…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {members.map((m) => (
              <label
                key={m.id}
                className="check-row"
                style={{ display: m.full_name.toLowerCase().includes(filter.toLowerCase()) ? 'flex' : 'none' }}
              >
                <input type="checkbox" name="members" value={m.id} />
                <span className="grow">{m.full_name}</span>
                <span className="small muted">{SET[m.alumni_set]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button className="btn" disabled={pending}>{pending ? 'Billing…' : 'Bill members'}</button>
    </form>
  );
}

import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { money, CATEGORY_LABELS, BILLING_LABELS } from '@/lib/format';
import TypeForm from './TypeForm';

export default async function PaymentTypes({ searchParams }) {
  await requireUser(['fin_sec', 'admin']);
  const sp = await searchParams;
  const { rows } = await query(
    `SELECT pt.*, (SELECT COUNT(*) FROM charges c WHERE c.payment_type_id = pt.id)::int AS uses
       FROM payment_types pt ORDER BY pt.active DESC, pt.name`
  );
  const editing = sp?.edit ? rows.find((r) => r.id === Number(sp.edit)) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payment types</h1>
          <div className="muted">Monthly dues, burial levies, contributions, donations — anything members pay.</div>
        </div>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>{editing ? `Edit “${editing.name}”` : 'Add a payment type'}</h2>
          <TypeForm key={editing?.id || 'new'} type={editing} />
        </div>
        <div className="card">
          <h2>All payment types</h2>
          <table>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} style={t.active ? undefined : { opacity: 0.55 }}>
                  <td>
                    <b>{t.name}</b> {!t.active && <span className="badge b-neutral">Inactive</span>}
                    <div className="small muted">{CATEGORY_LABELS[t.category]} · {BILLING_LABELS[t.billing]}</div>
                    {t.description && <div className="small muted">{t.description}</div>}
                  </td>
                  <td className="num">{t.default_amount ? money(t.default_amount) : <span className="muted small">Any amount</span>}</td>
                  <td><a className="btn secondary sm" href={`/finance/types?edit=${t.id}`}>Edit</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Monthly and one-off types are <b>billed</b> to members from “Bill members”. Voluntary types appear on members&apos; Pay page for them to pay any amount.
          </p>
        </div>
      </div>
    </>
  );
}

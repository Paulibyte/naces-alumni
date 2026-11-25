import { requireUser } from '@/lib/auth';
import { getStanding } from '@/lib/finance';
import { query } from '@/lib/db';
import PayForm from './PayForm';

export default async function PayPage() {
  const user = await requireUser();
  const s = await getStanding(user.id);
  const { rows: voluntaryTypes } = await query(
    `SELECT id, name, category, description, default_amount FROM payment_types WHERE active AND billing='voluntary' ORDER BY name`
  );
  const bank = {
    bank: process.env.NEXT_PUBLIC_BANK_NAME,
    name: process.env.NEXT_PUBLIC_ACCOUNT_NAME,
    number: process.env.NEXT_PUBLIC_ACCOUNT_NUMBER,
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Make a payment</h1>
          <div className="muted">Pay into the association account, then upload your slip here for the Financial Secretary to confirm.</div>
        </div>
      </div>
      <div className="card" style={{ background: 'var(--gold-soft)', borderColor: '#efdcae' }}>
        <h3>Association account</h3>
        <div className="grid g3" style={{ gap: 8 }}>
          <div><div className="small muted">Bank</div><b>{bank.bank}</b></div>
          <div><div className="small muted">Account name</div><b>{bank.name}</b></div>
          <div><div className="small muted">Account number</div><b style={{ fontSize: '1.15rem', letterSpacing: 1 }}>{bank.number}</b></div>
        </div>
      </div>
      <PayForm
        unpaid={s.unpaid.map((i) => ({ id: i.id, description: i.description, balance: i.balance }))}
        outstanding={s.outstanding}
        voluntaryTypes={voluntaryTypes}
      />
    </>
  );
}

import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import BillForm from './BillForm';

export default async function BillPage() {
  await requireUser(['fin_sec', 'admin']);
  const { rows: types } = await query(
    `SELECT id, name, billing, default_amount FROM payment_types WHERE active AND billing <> 'voluntary' ORDER BY billing, name`
  );
  const { rows: members } = await query(
    `SELECT id, full_name, alumni_set FROM users WHERE status='approved' ORDER BY full_name`
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bill members</h1>
          <div className="muted">
            Charge monthly dues for a month, or raise a levy (e.g. burial levy). The amount shows on each member&apos;s dashboard straight away, and any
            credit they hold is applied automatically.
          </div>
        </div>
      </div>
      <BillForm types={types} members={members} />
    </>
  );
}

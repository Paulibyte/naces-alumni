const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });
export const money = (n) => naira.format(Number(n || 0));

export const SET_LABELS = { ND2005: 'ND 2005', HND2008: 'HND 2008', BOTH: 'ND 2005 & HND 2008' };
export const CATEGORY_LABELS = {
  monthly_due: 'Monthly dues',
  levy: 'Levy',
  contribution: 'Contribution',
  donation: 'Donation',
  other: 'Other',
};
export const BILLING_LABELS = { monthly: 'Billed monthly', one_off: 'Billed when raised', voluntary: 'Voluntary (member pays any time)' };
export const METHOD_LABELS = { bank_transfer: 'Bank transfer', cash: 'Cash', pos: 'POS', other: 'Other' };

export function fmtDate(d) {
  if (!d) return '—';
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function periodLabel(p) {
  if (!p) return '';
  const [y, m] = p.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

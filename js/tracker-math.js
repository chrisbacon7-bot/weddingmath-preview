/** Per-line balance for the budget tracker. A quoted amount replaces the budget on that line. */

export function rowStillToPay(row) {
  const target = Number(row.quoted) || Number(row.budget) || 0;
  const paid = Number(row.paid) || 0;
  return Math.max(0, target - paid);
}

export function stillToPay(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => sum + rowStillToPay(row), 0);
}

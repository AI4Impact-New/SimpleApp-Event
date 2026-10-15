// Fees are integer paise, INR only
let inrFormat: Intl.NumberFormat | null | undefined;

export function formatPaise(paise: number): string {
  const rupees = (Number(paise) || 0) / 100;
  if (inrFormat === undefined) {
    try {
      inrFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    } catch {
      inrFormat = null;
    }
  }
  return inrFormat ? inrFormat.format(rupees) : `₹${rupees.toFixed(2)}`;
}

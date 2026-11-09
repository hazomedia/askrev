/**
 * Money utilities enforcing integer paise math (1 Rupee = 100 paise)
 * Never use floating point numbers for currency calculations.
 */

export function rupeesToPaise(rupees: number | string): bigint {
  const numeric = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(numeric)) {
    throw new Error(`Invalid rupee amount: ${rupees}`);
  }
  // Round to nearest integer paise to avoid IEEE-754 precision issues
  return BigInt(Math.round(numeric * 100));
}

export function paiseToRupees(paise: bigint | number): number {
  const p = typeof paise === 'bigint' ? Number(paise) : paise;
  return p / 100;
}

export function formatINR(paise: bigint | number, options?: { showPaise?: boolean }): string {
  const rupees = paiseToRupees(paise);
  const showDecimals = options?.showPaise ?? false;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

export function safeBigIntMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function safeBigIntMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

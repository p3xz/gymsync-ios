// Pro gating. There are no real payments yet: Pro is a manual toggle in
// Profile until checkout lands. When payments ship, the upgrade screen
// calls setPro(true) after a verified purchase.
//
// PAYMENTS TODO: hook Razorpay/UPI here — create order on your backend,
// verify the payment signature server-side, then setPro(true). Never
// trust the client alone for the purchase state.

import { Storage } from './storage';

const PRO_KEY = 'pro';

export async function isPro(): Promise<boolean> {
  return Storage.get<boolean>(PRO_KEY, false);
}

export async function setPro(value: boolean): Promise<void> {
  await Storage.set(PRO_KEY, value);
}

export const PRO_FEATURES: string[] = [
  'AI Coach — generate and edit routines with AI',
  'Progress charts — weekly volume and strength trends',
  'Backup & restore — never lose data to a reinstall',
];

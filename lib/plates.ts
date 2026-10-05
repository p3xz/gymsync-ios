// Plate math: greedy breakdown of the per-side load into standard
// plates. Exact to 10g; anything smaller is reported as a remainder.

export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateLoad {
  weight: number;
  count: number;
}

export interface PlateResult {
  /** Plates per side, largest first. */
  plates: PlateLoad[];
  /** Load per side actually achieved. */
  perSide: number;
  /** Total bar weight achieved. */
  total: number;
  /** True when the target is matched to within 10g. */
  exact: boolean;
}

export function calculatePlates(barWeight: number, targetWeight: number): PlateResult {
  const perSideTarget = Math.max(0, (targetWeight - barWeight) / 2);
  let remaining = Math.round(perSideTarget * 100) / 100;
  const plates: PlateLoad[] = [];
  for (const plate of STANDARD_PLATES) {
    const count = Math.floor(remaining / plate + 1e-9);
    if (count > 0) {
      plates.push({ weight: plate, count });
      remaining = Math.round((remaining - count * plate) * 100) / 100;
    }
  }
  const perSide = Math.round((perSideTarget - remaining) * 100) / 100;
  const total = Math.round((barWeight + perSide * 2) * 100) / 100;
  return { plates, perSide, total, exact: remaining < 0.01 };
}

export function scoreRecency(days: number) {
  if (days <= 7) return 5;
  if (days <= 30) return 4;
  if (days <= 90) return 3;
  if (days <= 180) return 2;
  return 1;
}

export function scoreFrequency(freq: number) {
  if (freq >= 10) return 5;
  if (freq >= 5) return 4;
  if (freq >= 3) return 3;
  if (freq >= 2) return 2;
  return 1;
}

export function scoreMonetary(amount: number) {
  if (amount >= 1000) return 5;
  if (amount >= 500) return 4;
  if (amount >= 200) return 3;
  if (amount >= 100) return 2;
  return 1;
}

export function segmentLabel(r: number, f: number, m: number) {
  if (r >= 4 && f >= 4 && m >= 4) return "Champions";
  if (r >= 3 && f >= 3) return "Loyal";
  if (r >= 3 && f <= 2) return "Promising";
  return "At Risk";
}

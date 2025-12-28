export function formatDate(value?: string | null, emptyValue = '—') {
  if (!value) return emptyValue;
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString();
}

export function formatMoney(value: number | null | undefined, emptyValue = '—') {
  if (value == null || Number.isNaN(value)) return emptyValue;
  return `$${value.toFixed(2)}`;
}

export function formatPoints(
  value: number | null | undefined,
  options: { emptyValue?: string | null; round?: boolean } = {}
) {
  const { emptyValue = '—', round = true } = options;
  if (value == null || Number.isNaN(value)) return emptyValue;
  const points = round ? Math.round(value) : value;
  return `${points} pts`;
}

export function formatPhone(value?: string | null) {
  if (!value) return '—';
  const raw = value.trim();
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length < 10) {
    return `+1 ${digits}`;
  }
  return `+${digits}`;
}

export function nameFromEmail(email?: string | null) {
  if (!email) return 'Unknown';
  const handle = email.split('@')[0] || '';
  if (!handle) return 'Unknown';
  return handle
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

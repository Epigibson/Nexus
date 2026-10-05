// Formato de fechas y duraciones en español.

const ISO = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?$/i;

/**
 * La API manda fechas UTC sin zona y con microsegundos ("2026-10-05T06:10:35.575528").
 * Se arman con Date.UTC en vez de new Date(string): Hermes no interpreta igual que V8
 * ese formato y las tomaba como hora local.
 */
export function parseDate(iso: string): Date {
  const m = ISO.exec(iso.trim());
  if (!m) return new Date(iso);
  const [, y, mo, d, h, mi, s = '0', frac = '0', tz] = m;
  let ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, Math.round(Number(`0.${frac}`) * 1000));
  if (tz && tz.toUpperCase() !== 'Z') {
    const sign = tz[0] === '-' ? -1 : 1;
    const [oh, om] = tz.slice(1).replace(':', '').match(/\d{2}/g)!.map(Number);
    ms -= sign * (oh * 60 + om) * 60000;
  }
  return new Date(ms);
}

/** "ahora", "hace 5 min", "hace 3 h", "ayer", "12 oct". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Nunca';
  const then = parseDate(iso).getTime();
  const diff = Math.max(0, Date.now() - then) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'ayer';
  return parseDate(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function dateTime(iso: string): string {
  return parseDate(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function duration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

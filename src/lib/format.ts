export const BLENDED_HOURLY_RATE = 180;

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  if (hours < 48) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const hr = hours % 24;
  return hr ? `${days}d ${hr}h` : `${days}d`;
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  const abs = Math.abs(hours);
  if (abs < 1) return `${Math.round(abs * 60)}m`;
  const digits = abs >= 10 ? 1 : 2;
  return `${abs.toFixed(digits)}h`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatDelta(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs === 0) return "$0.00";
  if (abs < 0.01) return `${sign}$${abs.toFixed(4)}`;
  if (abs < 1) return `${sign}$${abs.toFixed(3)}`;
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTokens(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatLatency(seconds: number | null): string {
  if (seconds == null) return "—";
  return `${seconds.toFixed(1)}s`;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

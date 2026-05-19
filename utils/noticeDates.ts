import moment from "moment";

export function parseDateInputStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseDateInputEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function formatNoticeDay(
  value: Date | string | number,
  format = "MMM D"
): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toISOString().endsWith("T00:00:00.000Z")) {
    return moment.utc(value).format(format);
  }
  return moment(value).format(format);
}

/** Next Monday 06:00 UTC, matching the cron schedule in vercel.json. */
export function nextRun(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setUTCHours(6, 0, 0, 0);
  const add = (8 - d.getUTCDay()) % 7 || 7;
  if (!(d.getUTCDay() === 1 && now < d)) d.setUTCDate(d.getUTCDate() + add);
  return d;
}
export const nextRunLabel = () => nextRun().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
export const REFRESH_SCHEDULE = "Mondays at 06:00 UTC";

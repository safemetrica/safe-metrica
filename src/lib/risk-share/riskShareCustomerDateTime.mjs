const SEOUL_TIME_ZONE = "Asia/Seoul";

/**
 * Format a stored instant for customer-facing SafeMetrica screens.
 * The source value remains unchanged; only the display boundary uses KST.
 *
 * @param {string} value
 * @returns {string}
 */
export function formatSeoulCustomerDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "일시 확인 필요";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value ?? "";
  const hour24 = Number(read("hour"));
  const hour12 = hour24 % 12 || 12;
  const dayPeriod = hour24 < 12 ? "오전" : "오후";

  return `${read("year")}. ${Number(read("month"))}. ${Number(read("day"))}. ${dayPeriod} ${hour12}:${read("minute")}`;
}

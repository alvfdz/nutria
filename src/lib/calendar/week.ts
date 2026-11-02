/**
 * Calendar days are plain `YYYY-MM-DD` keys with no time or zone attached.
 * Every calculation below goes through `Date.UTC` and the UTC getters, so a
 * result never depends on the machine's timezone or on daylight-saving shifts;
 * only {@link toDateKey} and {@link todayKey} read local parts, and only to
 * answer "what day is it here right now".
 */

/** Short English weekday names, indexed by `Date#getUTCDay()` (Sunday first). */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Short English month names, indexed by zero-based month. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Full English weekday names, indexed by `Date#getUTCDay()` (Sunday first). */
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Full English month names, indexed by zero-based month. */
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Zero-pads a number to two digits, as calendar keys require. */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Renders a `Date` built with `Date.UTC` back to a key using the UTC getters,
 * so the value it was created from round-trips unchanged.
 *
 * @param date A date constructed in UTC.
 * @returns The date as `YYYY-MM-DD`.
 */
function formatUtcKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Splits a `YYYY-MM-DD` key into its numeric year, month and day parts. */
function partsOf(dateKey: string): [number, number, number] {
  const [year, month, day] = dateKey.split("-").map(Number);

  return [year, month, day];
}

/**
 * Reads the local calendar day of a `Date` as a key. Local means the server's
 * zone, which self-hosters set through `TZ` so that it matches where they are.
 *
 * @param date Any point in time.
 * @returns That instant's local date as `YYYY-MM-DD`.
 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The local calendar day at the moment this runs.
 *
 * @returns Today as `YYYY-MM-DD`.
 */
export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * Checks that a value is a `YYYY-MM-DD` key naming a real calendar day.
 * Rejects wrong shapes such as `2026-2-3` and impossible dates such as
 * `2026-02-31` (which `Date.UTC` would silently roll over).
 *
 * @param value Any value, typically from a URL or a form.
 * @returns `true` when the value is a valid calendar key.
 */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = partsOf(value);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The Monday of the week containing `dateKey`, in the Monday → Sunday week the
 * calendar uses.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @returns That week's Monday as `YYYY-MM-DD`.
 */
export function startOfWeek(dateKey: string): string {
  const [year, month, day] = partsOf(dateKey);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  // `getUTCDay` calls Sunday 0; Monday is one day back, Sunday six.
  const daysSinceMonday = (weekday + 6) % 7;

  return formatUtcKey(
    new Date(Date.UTC(year, month - 1, day - daysSinceMonday)),
  );
}

/**
 * Moves a date key a whole number of days, forwards or backwards.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @param days Days to add; negative moves into the past.
 * @returns The shifted date as `YYYY-MM-DD`.
 */
export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = partsOf(dateKey);

  return formatUtcKey(new Date(Date.UTC(year, month - 1, day + days)));
}

/**
 * Moves a date key a whole number of weeks, forwards or backwards.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @param weeks Weeks to add; negative moves into the past.
 * @returns The shifted date as `YYYY-MM-DD`.
 */
export function addWeeks(dateKey: string, weeks: number): string {
  return addDays(dateKey, weeks * 7);
}

/**
 * The seven days of a week, always Monday first and Sunday last.
 *
 * @param weekStartKey The week's Monday.
 * @returns Seven `YYYY-MM-DD` keys, Monday → Sunday.
 */
export function weekDays(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartKey, index));
}

/**
 * Labels a week as a human range. The month is written once when the week
 * stays inside a month, once per month when it straddles two, and the year is
 * repeated only when the week straddles a year boundary.
 *
 * @param weekStartKey The week's Monday.
 * @returns A label such as `12 – 18 Oct 2026` or `29 Dec 2025 – 4 Jan 2026`.
 */
export function formatWeekRange(weekStartKey: string): string {
  const endKey = addDays(weekStartKey, 6);
  const [startYear, startMonth, startDay] = partsOf(weekStartKey);
  const [endYear, endMonth, endDay] = partsOf(endKey);
  const startMonthName = MONTHS[startMonth - 1];
  const endMonthName = MONTHS[endMonth - 1];

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay} – ${endDay} ${endMonthName} ${endYear}`;
  }

  if (startYear === endYear) {
    return `${startDay} ${startMonthName} – ${endDay} ${endMonthName} ${endYear}`;
  }

  return `${startDay} ${startMonthName} ${startYear} – ${endDay} ${endMonthName} ${endYear}`;
}

/**
 * Labels a single day for a column header. The month is added on the first of
 * a month, where a bare day number would be ambiguous.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @returns A label such as `Mon 12`, or `Sat 1 Aug` on the first of a month.
 */
export function formatDayLabel(dateKey: string): string {
  const [year, month, day] = partsOf(dateKey);
  const weekday =
    WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return day === 1 ? `${weekday} 1 ${MONTHS[month - 1]}` : `${weekday} ${day}`;
}

/**
 * Spells a day out in full, for the title of the Today page.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @returns A label such as `Monday, 2 November`.
 */
export function formatLongDate(dateKey: string): string {
  const [year, month, day] = partsOf(dateKey);
  const weekday =
    WEEKDAYS_LONG[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

  return `${weekday}, ${day} ${MONTHS_LONG[month - 1]}`;
}

/**
 * Short English weekday name for a calendar key, e.g. `Mon`. Independent of
 * {@link formatDayLabel}, which also carries the day number.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @returns The three-letter weekday abbreviation.
 */
export function weekdayShort(dateKey: string): string {
  const [year, month, day] = partsOf(dateKey);

  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/**
 * The day of the month as a bare number string, e.g. `13`. Used for the
 * circled day number in a week column header, where the weekday is already
 * spelled out separately.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @returns The day of the month, `1`–`31`.
 */
export function dayOfMonth(dateKey: string): string {
  const [, , day] = partsOf(dateKey);

  return String(day);
}

/**
 * Turns a `YYYY-MM-DD` key into the `Date` the database's `@db.Date` columns
 * store: UTC midnight. Using UTC here (rather than a local constructor) keeps
 * the stored day from shifting across timezones.
 *
 * @param dateKey Any valid `YYYY-MM-DD` key.
 * @returns The same day at UTC midnight.
 */
export function dbDateFromKey(dateKey: string): Date {
  const [year, month, day] = partsOf(dateKey);

  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * The inverse of {@link dbDateFromKey}: reads a `@db.Date` value back as a
 * `YYYY-MM-DD` key. Prisma returns those columns as `Date` at UTC midnight,
 * so the UTC getters round-trip the stored day exactly.
 *
 * @param date A `Date` read from a `@db.Date` column.
 * @returns The stored day as `YYYY-MM-DD`.
 */
export function keyFromDbDate(date: Date): string {
  return formatUtcKey(date);
}

/**
 * Resolves the `?week=` search parameter to the Monday of the week it names.
 * A valid date key anywhere in a week selects that whole week; a repeated
 * parameter uses its first entry; anything else falls back to the week the
 * user is currently in.
 *
 * @param value The raw `week` search parameter, if any.
 * @returns The selected week's Monday as `YYYY-MM-DD`.
 */
export function parseWeekParam(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  return isDateKey(candidate)
    ? startOfWeek(candidate)
    : startOfWeek(todayKey());
}

/**
 * Applies the "can't look back" rule: the calendar never shows a week before
 * the current one. Future weeks are returned untouched.
 *
 * @param weekStartKey The week's Monday, as parsed from the query string.
 * @returns The current week when `weekStartKey` is in the past, else itself.
 */
export function clampWeekToCurrent(weekStartKey: string): string {
  const currentWeek = startOfWeek(todayKey());

  return !isDateKey(weekStartKey) || weekStartKey < currentWeek
    ? currentWeek
    : weekStartKey;
}

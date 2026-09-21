export const DEALER_TIME_ZONE = "America/Winnipeg";

export type DealerHoursKind = "open" | "closed" | "closedUntilMonday";

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const wallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DEALER_TIME_ZONE,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23"
});

function wallClock(now: Date, timeZone: string): { weekday: number; minutes: number } {
  const formatter =
    timeZone === DEALER_TIME_ZONE
      ? wallClockFormatter
      : new Intl.DateTimeFormat("en-US", {
          timeZone,
          weekday: "short",
          hour: "numeric",
          minute: "numeric",
          hourCycle: "h23"
        });
  const parts = formatter.formatToParts(now);
  const weekdayName = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  let hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour === 24) hour = 0;
  const weekday = weekdayNames.indexOf(weekdayName as (typeof weekdayNames)[number]);
  return {
    weekday: weekday < 0 ? 0 : weekday,
    minutes: hour * 60 + minute
  };
}

/** Open Mon–Fri [09:00, 17:00) in the given IANA zone. Default America/Winnipeg. */
export function isDealerOpen(now: Date, timeZone = DEALER_TIME_ZONE): boolean {
  return dealerHoursKind(now, timeZone) === "open";
}

export function dealerHoursKind(now: Date, timeZone = DEALER_TIME_ZONE): DealerHoursKind {
  const { weekday, minutes } = wallClock(now, timeZone);
  const openStart = 9 * 60;
  const openEnd = 17 * 60;
  const isWeekday = weekday >= 1 && weekday <= 5;
  if (isWeekday && minutes >= openStart && minutes < openEnd) {
    return "open";
  }
  // Friday after close, all weekend, and Monday before open → Monday.
  if (weekday === 5 && minutes >= openEnd) return "closedUntilMonday";
  if (weekday === 6 || weekday === 0) return "closedUntilMonday";
  if (weekday === 1 && minutes < openStart) return "closedUntilMonday";
  return "closed";
}

import {
  addDays,
  startOfDay,
  isSameDay,
  getDaysInMonth,
  setDate,
  startOfMonth,
  addMonths,
} from "date-fns";
import type { TransactionRule, ScheduleDateData, OccurrenceOverrideData, OccurrenceStatus } from "@/types";

export function expandOccurrences(
  rule: TransactionRule,
  windowStart: Date,
  windowEnd: Date
): Array<{ date: Date; override: OccurrenceOverrideData | null }> {
  // Payment plan with specific dates
  if (rule.isFinite && rule.scheduleDates.length > 0) {
    return expandSpecificDates(rule.scheduleDates, rule.occurrenceOverrides, windowStart, windowEnd);
  }

  const pattern = rule.recurrencePattern;

  if (!rule.isRecurring || pattern === "once" || !pattern) {
    return expandOnce(rule, windowStart, windowEnd);
  }

  if (pattern === "monthly") {
    return expandMonthly(rule, windowStart, windowEnd);
  }

  // biweekly, weekly, or custom intervalDays
  const days =
    rule.intervalDays ??
    (pattern === "biweekly" ? 14 : pattern === "weekly" ? 7 : null);

  if (days === null || !rule.specificDate) return [];

  return expandInterval(rule, days, windowStart, windowEnd);
}

function expandSpecificDates(
  scheduleDates: ScheduleDateData[],
  overrides: OccurrenceOverrideData[],
  windowStart: Date,
  windowEnd: Date
): Array<{ date: Date; override: OccurrenceOverrideData | null }> {
  return scheduleDates
    .filter((sd) => {
      const d = startOfDay(sd.date);
      return d >= startOfDay(windowStart) && d <= startOfDay(windowEnd);
    })
    .map((sd) => {
      const override = overrides.find((o) => isSameDay(o.occurrenceDate, sd.date)) ?? null;
      const effectiveDate = override?.newDate ?? sd.date;
      // Merge schedule date status into a pseudo-override
      const merged: OccurrenceOverrideData | null =
        override ??
        (sd.status !== "pending"
          ? { occurrenceDate: sd.date, status: sd.status as OccurrenceStatus, actualAmount: sd.actualAmount, newDate: null, note: null }
          : null);
      return { date: effectiveDate, override: merged };
    });
}

function expandOnce(
  rule: TransactionRule,
  windowStart: Date,
  windowEnd: Date
): Array<{ date: Date; override: OccurrenceOverrideData | null }> {
  if (!rule.specificDate) return [];
  const d = startOfDay(rule.specificDate);
  if (d < startOfDay(windowStart) || d > startOfDay(windowEnd)) return [];
  const override = rule.occurrenceOverrides.find((o) => isSameDay(o.occurrenceDate, d)) ?? null;
  const effectiveDate = override?.newDate ?? d;
  return [{ date: effectiveDate, override }];
}

function expandMonthly(
  rule: TransactionRule,
  windowStart: Date,
  windowEnd: Date
): Array<{ date: Date; override: OccurrenceOverrideData | null }> {
  if (!rule.dueDay) return [];
  const results: Array<{ date: Date; override: OccurrenceOverrideData | null }> = [];

  let cursor = startOfMonth(windowStart);
  let occurrenceCount = 0;

  while (cursor <= windowEnd) {
    const daysInMonth = getDaysInMonth(cursor);
    const day = Math.min(rule.dueDay, daysInMonth);
    const occurrence = startOfDay(setDate(cursor, day));

    if (occurrence >= startOfDay(windowStart) && occurrence <= startOfDay(windowEnd)) {
      if (rule.isFinite) {
        if (rule.endDate && occurrence > startOfDay(rule.endDate)) break;
        if (rule.maxOccurrences && occurrenceCount >= rule.maxOccurrences) break;
      }

      const override = rule.occurrenceOverrides.find((o) => isSameDay(o.occurrenceDate, occurrence)) ?? null;
      const effectiveDate = override?.newDate ?? occurrence;
      results.push({ date: effectiveDate, override });
      occurrenceCount++;
    }

    cursor = addMonths(cursor, 1);
  }

  return results;
}

function expandInterval(
  rule: TransactionRule,
  intervalDays: number,
  windowStart: Date,
  windowEnd: Date
): Array<{ date: Date; override: OccurrenceOverrideData | null }> {
  if (!rule.specificDate) return [];
  const results: Array<{ date: Date; override: OccurrenceOverrideData | null }> = [];

  let anchor = startOfDay(rule.specificDate);
  const ws = startOfDay(windowStart);

  // Step forward to first occurrence on or after windowStart
  while (anchor < ws) {
    anchor = addDays(anchor, intervalDays);
  }

  let occurrenceCount = 0;

  while (anchor <= startOfDay(windowEnd)) {
    if (rule.isFinite) {
      if (rule.endDate && anchor > startOfDay(rule.endDate)) break;
      if (rule.maxOccurrences && occurrenceCount >= rule.maxOccurrences) break;
    }

    const override = rule.occurrenceOverrides.find((o) => isSameDay(o.occurrenceDate, anchor)) ?? null;
    const effectiveDate = override?.newDate ?? anchor;
    results.push({ date: effectiveDate, override });
    occurrenceCount++;
    anchor = addDays(anchor, intervalDays);
  }

  return results;
}

export function countTotalOccurrences(rule: TransactionRule): number {
  if (rule.scheduleDates.length > 0) return rule.scheduleDates.length;
  if (rule.maxOccurrences) return rule.maxOccurrences;
  return Infinity;
}

export function countPaidOccurrences(rule: TransactionRule): number {
  const fromOverrides = rule.occurrenceOverrides.filter((o) => o.status === "paid").length;
  const fromSchedule = rule.scheduleDates.filter((sd) => sd.status === "paid").length;
  return Math.max(fromOverrides, fromSchedule);
}

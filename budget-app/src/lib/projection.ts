import { addDays, startOfDay, isSameDay } from "date-fns";
import { expandOccurrences } from "./recurrence";
import type {
  TransactionRule,
  ProjectedEvent,
  DayProjection,
  ProjectionResult,
  CategoryType,
} from "@/types";

export function computeProjection(
  currentBalance: number,
  transactionRules: TransactionRule[],
  windowDays: number = 60
): ProjectionResult {
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, windowDays);

  // Expand all rules into concrete dated events
  const allEvents: Array<{
    date: Date;
    rule: TransactionRule;
    status: string;
    actualAmount: number | null;
  }> = [];

  for (const rule of transactionRules) {
    if (rule.status === "archived" || rule.status === "ignored") continue;

    const occurrences = expandOccurrences(rule, today, windowEnd);

    for (const { date, override } of occurrences) {
      const status = override?.status ?? "pending";
      allEvents.push({
        date,
        rule,
        status,
        actualAmount: override?.actualAmount ?? null,
      });
    }
  }

  // Sort by date ascending
  allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  const days: DayProjection[] = [];
  let runningBalance = currentBalance;

  for (let i = 0; i <= windowDays; i++) {
    const date = addDays(today, i);
    const dayEvents = allEvents.filter((e) => isSameDay(e.date, date));

    const openingBalance = runningBalance;
    const projectedEvents: ProjectedEvent[] = [];

    for (const event of dayEvents) {
      const effectiveAmount = event.actualAmount ?? event.rule.amount;

      if (event.status === "skipped") {
        projectedEvents.push({
          date: event.date,
          transactionId: event.rule.id,
          transactionName: event.rule.name,
          categoryType: event.rule.categoryId as unknown as CategoryType,
          amount: effectiveAmount,
          type: event.rule.type,
          status: "skipped",
          runningBalance,
          memberId: event.rule.memberId,
          visibility: event.rule.visibility,
        });
        continue;
      }

      if (event.rule.type === "income") {
        runningBalance += effectiveAmount;
      } else if (event.rule.type === "expense") {
        runningBalance -= effectiveAmount;
      }

      projectedEvents.push({
        date: event.date,
        transactionId: event.rule.id,
        transactionName: event.rule.name,
        categoryType: event.rule.categoryId as unknown as CategoryType,
        amount: effectiveAmount,
        type: event.rule.type,
        status: event.status as "pending" | "paid",
        runningBalance,
        memberId: event.rule.memberId,
        visibility: event.rule.visibility,
      });
    }

    days.push({
      date,
      events: projectedEvents,
      openingBalance,
      closingBalance: runningBalance,
      isOverdraft: runningBalance < 0,
    });
  }

  const overdraftDays = days.filter((d) => d.isOverdraft);

  return {
    days,
    overdraftDays,
    balanceAt7Days: days[7]?.closingBalance ?? currentBalance,
    balanceAt14Days: days[14]?.closingBalance ?? currentBalance,
    balanceAt30Days: days[30]?.closingBalance ?? currentBalance,
    earliestOverdraft: overdraftDays[0]?.date ?? null,
  };
}

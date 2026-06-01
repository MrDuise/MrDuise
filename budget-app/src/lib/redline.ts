import { startOfDay, subDays } from "date-fns";
import type { RedLineResult, DayProjection } from "@/types";

export function computeRedLine(
  projectionDays: DayProjection[],
  recentTransactions: Array<{ date: Date; amount: number; type: string }>,
  lookbackDays: number = 14
): RedLineResult {
  const today = startOfDay(new Date());
  const lookbackStart = subDays(today, lookbackDays);

  // Calculate average daily spend from recent history
  const recent = recentTransactions.filter(
    (t) => t.type === "expense" && t.date >= lookbackStart && t.date < today
  );

  const totalSpent = recent.reduce((sum, t) => sum + t.amount, 0);
  const avgDailySpend = lookbackDays > 0 ? totalSpent / lookbackDays : 0;

  if (avgDailySpend <= 0 || projectionDays.length === 0) {
    return { redLineDate: null, avgDailySpend, daysUntilRedLine: null, projectionPoints: [] };
  }

  // Build red-line trajectory: start from today's balance, subtract avg daily spend each day
  // but still include known fixed income/bill events from projection
  const currentBalance = projectionDays[0]?.openingBalance ?? 0;
  const projectionPoints: Array<{ date: Date; balance: number }> = [];
  let balance = currentBalance;
  let redLineDate: Date | null = null;
  let daysUntilRedLine: number | null = null;

  for (let i = 0; i < projectionDays.length; i++) {
    const day = projectionDays[i];

    // Apply known fixed-bill events from projection (income and fixed expenses)
    for (const event of day.events) {
      if (event.status === "skipped") continue;
      if (event.type === "income") balance += event.amount;
    }

    // Subtract average daily spend
    balance -= avgDailySpend;

    projectionPoints.push({ date: day.date, balance });

    if (balance < 0 && redLineDate === null) {
      redLineDate = day.date;
      daysUntilRedLine = i;
    }
  }

  return { redLineDate, avgDailySpend, daysUntilRedLine, projectionPoints };
}

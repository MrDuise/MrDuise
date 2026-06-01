import { startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import type { AllowanceResult, TransactionRule, CategoryType } from "@/types";

const FIXED_TYPES: CategoryType[] = ["FIXED_BILL"];
const VARIABLE_RECURRING_TYPES: CategoryType[] = ["VARIABLE_RECURRING"];
const BUDGETED_TYPES: CategoryType[] = ["VARIABLE_REGULAR", "SHARED"];
const UNPLANNED_TYPES: CategoryType[] = ["UNPLANNED"];

interface AllowanceInput {
  rules: TransactionRule[];
  categoryTypeMap: Record<string, CategoryType>;
  budgetAmounts: Record<string, number>;
  alreadySpent: Record<string, number>;
  today: Date;
}

export function computeAllowance(input: AllowanceInput): AllowanceResult {
  const { rules, categoryTypeMap, budgetAmounts, alreadySpent, today } = input;

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = getDaysInMonth(today);
  const dayOfMonth = today.getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

  // Income expected this month
  let projectedIncome = 0;
  let fixedObligations = 0;
  let variableEstimates = 0;
  let budgetAllocations = 0;
  let alreadySpentUnplanned = 0;

  for (const rule of rules) {
    if (rule.status === "archived" || rule.status === "ignored") continue;

    const catType = categoryTypeMap[rule.categoryId];
    const monthlyOccurrences = countMonthlyOccurrences(rule, monthStart, monthEnd);

    if (rule.type === "income") {
      projectedIncome += rule.amount * monthlyOccurrences;
      continue;
    }

    if (FIXED_TYPES.includes(catType)) {
      fixedObligations += rule.amount * monthlyOccurrences;
    } else if (VARIABLE_RECURRING_TYPES.includes(catType)) {
      variableEstimates += (rule.estimatedAmount ?? rule.amount) * monthlyOccurrences;
    }
  }

  // Budget allocations for variable/shared categories
  for (const [categoryId, budgeted] of Object.entries(budgetAmounts)) {
    const catType = categoryTypeMap[categoryId];
    if (catType && BUDGETED_TYPES.includes(catType)) {
      budgetAllocations += budgeted;
    }
  }

  // Already spent on unplanned this month
  for (const [categoryId, spent] of Object.entries(alreadySpent)) {
    const catType = categoryTypeMap[categoryId];
    if (catType && UNPLANNED_TYPES.includes(catType)) {
      alreadySpentUnplanned += spent;
    }
  }

  const remaining =
    projectedIncome - fixedObligations - variableEstimates - budgetAllocations - alreadySpentUnplanned;

  const dailyAllowance = remaining / daysRemaining;

  return {
    dailyAllowance,
    isOverPace: dailyAllowance < 0,
    projectedIncome,
    fixedObligations,
    variableEstimates,
    budgetAllocations,
    alreadySpentUnplanned,
    daysRemaining,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function countMonthlyOccurrences(rule: TransactionRule, monthStart: Date, _monthEnd?: Date): number {
  if (!rule.isRecurring) return 0;

  const pattern = rule.recurrencePattern;
  if (pattern === "monthly") return 1;
  if (pattern === "biweekly") return 2.17; // avg
  if (pattern === "weekly") return 4.33;

  if (pattern === "custom" && rule.intervalDays) {
    const daysInMonth = getDaysInMonth(monthStart);
    return daysInMonth / rule.intervalDays;
  }

  return 0;
}

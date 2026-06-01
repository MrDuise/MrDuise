import type { HistoryReport, CategoryType } from "@/types";

interface ReportTransaction {
  id: string;
  name: string;
  amount: number;
  type: string;
  categoryId: string;
  status: string;
  createdAt: Date;
}

interface ReportCategory {
  id: string;
  name: string;
  type: CategoryType;
}

interface ReportBudget {
  categoryId: string;
  amount: number;
}

export function computeHistoryReport(
  transactions: ReportTransaction[],
  categories: ReportCategory[],
  budgets: ReportBudget[],
  from: Date,
  to: Date
): HistoryReport {
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.categoryId, b.amount]));

  let totalIncome = 0;
  let totalExpenses = 0;
  let untrackedCount = 0;
  const categoryTotals: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.status === "ignored") continue;
    if (tx.status === "unreviewed") {
      untrackedCount++;
      continue;
    }

    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
      totalExpenses += tx.amount;
      categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] ?? 0) + tx.amount;
    }
  }

  const byCategory = categories
    .filter((c) => categoryTotals[c.id] !== undefined || budgetMap[c.id] !== undefined)
    .map((c) => {
      const actual = categoryTotals[c.id] ?? 0;
      const budgeted = budgetMap[c.id] ?? 0;
      return {
        categoryId: c.id,
        categoryName: c.name,
        categoryType: c.type,
        budgeted,
        actual,
        variance: budgeted - actual,
      };
    })
    .sort((a, b) => a.variance - b.variance);

  const net = totalIncome - totalExpenses;
  const backOnTrackAmount = net < 0 ? Math.abs(net) : null;

  return {
    from,
    to,
    totalIncome,
    totalExpenses,
    net,
    byCategory,
    untrackedCount,
    backOnTrackAmount,
  };
}

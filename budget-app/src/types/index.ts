export type RecurrencePattern = "monthly" | "biweekly" | "weekly" | "once" | "custom";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionVisibility = "personal" | "shared";
export type OccurrenceStatus = "pending" | "paid" | "skipped" | "postponed";
export type TransactionStatus = "pending" | "paid" | "skipped" | "unreviewed" | "archived" | "ignored";
export type CategoryType =
  | "FIXED_BILL"
  | "VARIABLE_RECURRING"
  | "VARIABLE_REGULAR"
  | "SHARED"
  | "UNPLANNED"
  | "PROJECTED_FUTURE"
  | "SAVINGS"
  | "INVESTMENT";
export type AccountType = "checking" | "savings" | "investment" | "credit" | "cash" | "custom";

export interface TransactionRule {
  id: string;
  name: string;
  amount: number;
  estimatedAmount: number | null;
  type: TransactionType;
  categoryId: string;
  memberId: string | null;
  visibility: TransactionVisibility;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  dueDay: number | null;
  specificDate: Date | null;
  intervalDays: number | null;
  isFinite: boolean;
  maxOccurrences: number | null;
  endDate: Date | null;
  status: TransactionStatus;
  occurrenceOverrides: OccurrenceOverrideData[];
  scheduleDates: ScheduleDateData[];
}

export interface OccurrenceOverrideData {
  occurrenceDate: Date;
  status: OccurrenceStatus;
  actualAmount: number | null;
  newDate: Date | null;
  note: string | null;
}

export interface ScheduleDateData {
  id: string;
  date: Date;
  status: OccurrenceStatus;
  actualAmount: number | null;
}

export interface ProjectedEvent {
  date: Date;
  transactionId: string;
  transactionName: string;
  categoryType: CategoryType;
  amount: number;
  type: TransactionType;
  status: OccurrenceStatus;
  runningBalance: number;
  memberId: string | null;
  visibility: TransactionVisibility;
}

export interface DayProjection {
  date: Date;
  events: ProjectedEvent[];
  openingBalance: number;
  closingBalance: number;
  isOverdraft: boolean;
}

export interface ProjectionResult {
  days: DayProjection[];
  overdraftDays: DayProjection[];
  balanceAt7Days: number;
  balanceAt14Days: number;
  balanceAt30Days: number;
  earliestOverdraft: Date | null;
}

export interface AllowanceResult {
  dailyAllowance: number;
  isOverPace: boolean;
  projectedIncome: number;
  fixedObligations: number;
  variableEstimates: number;
  budgetAllocations: number;
  alreadySpentUnplanned: number;
  daysRemaining: number;
}

export interface RedLineResult {
  redLineDate: Date | null;
  avgDailySpend: number;
  daysUntilRedLine: number | null;
  projectionPoints: Array<{ date: Date; balance: number }>;
}

export interface HistoryReport {
  from: Date;
  to: Date;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryType: CategoryType;
    budgeted: number;
    actual: number;
    variance: number;
  }>;
  untrackedCount: number;
  backOnTrackAmount: number | null;
}

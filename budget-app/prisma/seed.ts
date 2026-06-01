import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaLibSql({ url: "file:./dev.db" } as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  await db.paymentScheduleDate.deleteMany();
  await db.occurrenceOverride.deleteMany();
  await db.transaction.deleteMany();
  await db.budget.deleteMany();
  await db.category.deleteMany();
  await db.balanceSnapshot.deleteMany();
  await db.bankAccount.deleteMany();
  await db.householdMember.deleteMany();
  await db.household.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  const michael = await db.user.create({
    data: { name: "Michael", email: "michael@example.com", password: passwordHash },
  });

  const sarah = await db.user.create({
    data: { name: "Sarah", email: "sarah@example.com", password: passwordHash },
  });

  const household = await db.household.create({
    data: { name: "Our Budget" },
  });

  const michaelMember = await db.householdMember.create({
    data: { householdId: household.id, userId: michael.id, role: "owner" },
  });

  const sarahMember = await db.householdMember.create({
    data: { householdId: household.id, userId: sarah.id, role: "member" },
  });

  const checking = await db.bankAccount.create({
    data: {
      householdId: household.id,
      memberId: michaelMember.id,
      name: "Joint Checking",
      type: "checking",
      currentBalance: 1243.55,
    },
  });

  const sarahChecking = await db.bankAccount.create({
    data: {
      householdId: household.id,
      memberId: sarahMember.id,
      name: "Sarah's Checking",
      type: "checking",
      currentBalance: 820.00,
    },
  });

  // Categories
  const cats = await Promise.all([
    db.category.create({ data: { householdId: household.id, name: "Rent / Mortgage", type: "FIXED_BILL", color: "#ef4444", icon: "home", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Car Payment", type: "FIXED_BILL", color: "#f97316", icon: "car", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Subscriptions", type: "FIXED_BILL", color: "#eab308", icon: "tv", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Utilities", type: "VARIABLE_RECURRING", color: "#84cc16", icon: "zap", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Credit Card", type: "VARIABLE_RECURRING", color: "#22c55e", icon: "credit-card", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Gas", type: "VARIABLE_REGULAR", color: "#14b8a6", icon: "fuel", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Food / Groceries", type: "SHARED", color: "#3b82f6", icon: "shopping-cart", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Unplanned", type: "UNPLANNED", color: "#8b5cf6", icon: "help-circle", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Future Expense", type: "PROJECTED_FUTURE", color: "#a855f7", icon: "calendar", isSystem: true } }),
    db.category.create({ data: { householdId: household.id, name: "Personal Care", type: "VARIABLE_REGULAR", color: "#06b6d4", icon: "scissors", isSystem: true } }),
  ]);

  const [rent, car, subs, utilities, creditCard, gas, food, unplanned, future] = cats;

  // Michael's recurring expenses
  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: car.id,
      name: "Car Payment",
      amount: 287.00,
      type: "expense",
      visibility: "personal",
      isRecurring: true,
      recurrencePattern: "monthly",
      dueDay: 15,
      status: "pending",
    },
  });

  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: subs.id,
      name: "Netflix",
      amount: 15.99,
      type: "expense",
      visibility: "shared",
      isRecurring: true,
      recurrencePattern: "monthly",
      dueDay: 8,
      status: "pending",
    },
  });

  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: subs.id,
      name: "Phone Bill",
      amount: 45.00,
      type: "expense",
      visibility: "personal",
      isRecurring: true,
      recurrencePattern: "monthly",
      dueDay: 10,
      status: "pending",
    },
  });

  // Sarah's rent (she primarily pays it)
  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: sarahChecking.id,
      memberId: sarahMember.id,
      categoryId: rent.id,
      name: "Rent",
      amount: 1100.00,
      type: "expense",
      visibility: "shared",
      isRecurring: true,
      recurrencePattern: "monthly",
      dueDay: 1,
      status: "pending",
    },
  });

  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: sarahChecking.id,
      memberId: sarahMember.id,
      categoryId: utilities.id,
      name: "Electric Bill",
      amount: 95.00,
      type: "expense",
      visibility: "shared",
      isRecurring: true,
      recurrencePattern: "monthly",
      dueDay: 18,
      estimatedAmount: 90.00,
      status: "pending",
    },
  });

  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: utilities.id,
      name: "Internet",
      amount: 60.00,
      type: "expense",
      visibility: "shared",
      isRecurring: true,
      recurrencePattern: "monthly",
      dueDay: 22,
      status: "pending",
    },
  });

  // Shared food budget
  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: null,
      categoryId: food.id,
      name: "Groceries",
      amount: 120.00,
      type: "expense",
      visibility: "shared",
      isRecurring: true,
      recurrencePattern: "weekly",
      specificDate: new Date("2026-01-03"),
      status: "pending",
    },
  });

  // Sarah's biweekly income
  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: sarahChecking.id,
      memberId: sarahMember.id,
      categoryId: food.id, // placeholder — income doesn't need category
      name: "Sarah's Paycheck",
      amount: 1650.00,
      type: "income",
      visibility: "personal",
      isRecurring: true,
      recurrencePattern: "biweekly",
      specificDate: new Date("2026-05-30"),
      status: "pending",
    },
  });

  // Michael's variable income (one-time entry — he adds these manually)
  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: food.id,
      name: "Paycheck",
      amount: 480.00,
      type: "income",
      visibility: "personal",
      isRecurring: false,
      recurrencePattern: "once",
      specificDate: addDays(new Date(), 3),
      status: "pending",
    },
  });

  // A payment plan example: 4 weekly payments for a purchase
  const paymentPlan = await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: unplanned.id,
      name: "Couch Payment Plan",
      amount: 75.00,
      type: "expense",
      visibility: "personal",
      isRecurring: true,
      recurrencePattern: "custom",
      isFinite: true,
      intervalDays: 7,
      maxOccurrences: 4,
      specificDate: addDays(new Date(), 2),
      status: "pending",
    },
  });

  // A future planned expense
  await db.transaction.create({
    data: {
      householdId: household.id,
      bankAccountId: checking.id,
      memberId: michaelMember.id,
      categoryId: future.id,
      name: "New Tires",
      amount: 450.00,
      type: "expense",
      visibility: "personal",
      isRecurring: false,
      recurrencePattern: "once",
      specificDate: addDays(new Date(), 45),
      status: "pending",
    },
  });

  // Budgets
  await db.budget.createMany({
    data: [
      { householdId: household.id, categoryId: food.id, amount: 500, period: "monthly" },
      { householdId: household.id, categoryId: gas.id, amount: 150, period: "monthly" },
      { householdId: household.id, categoryId: unplanned.id, amount: 100, period: "monthly" },
      { householdId: household.id, categoryId: utilities.id, amount: 200, period: "monthly" },
      { householdId: household.id, categoryId: creditCard.id, amount: 300, period: "monthly" },
    ],
  });

  console.log("Seed complete.");
  console.log("Login: michael@example.com / password123");
  console.log("       sarah@example.com / password123");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

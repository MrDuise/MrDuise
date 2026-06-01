import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SYSTEM_CATEGORIES = [
  { name: "Rent / Mortgage", type: "FIXED_BILL", color: "#ef4444", icon: "home" },
  { name: "Car Payment", type: "FIXED_BILL", color: "#f97316", icon: "car" },
  { name: "Subscriptions", type: "FIXED_BILL", color: "#eab308", icon: "tv" },
  { name: "Utilities", type: "VARIABLE_RECURRING", color: "#84cc16", icon: "zap" },
  { name: "Credit Card", type: "VARIABLE_RECURRING", color: "#22c55e", icon: "credit-card" },
  { name: "Gas", type: "VARIABLE_REGULAR", color: "#14b8a6", icon: "fuel" },
  { name: "Personal Care", type: "VARIABLE_REGULAR", color: "#06b6d4", icon: "scissors" },
  { name: "Food / Groceries", type: "SHARED", color: "#3b82f6", icon: "shopping-cart" },
  { name: "Household Supplies", type: "SHARED", color: "#6366f1", icon: "package" },
  { name: "Unplanned", type: "UNPLANNED", color: "#8b5cf6", icon: "help-circle" },
  { name: "Future Expense", type: "PROJECTED_FUTURE", color: "#a855f7", icon: "calendar" },
  { name: "Savings", type: "SAVINGS", color: "#ec4899", icon: "piggy-bank" },
  { name: "Investment", type: "INVESTMENT", color: "#f43f5e", icon: "trending-up" },
];

export async function POST(req: Request) {
  try {
    const { name, email, password, householdName } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await db.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: { name, email, password: hashed },
      });

      const household = await tx.household.create({
        data: { name: householdName || "My Budget" },
      });

      await tx.householdMember.create({
        data: { householdId: household.id, userId: user.id, role: "owner" },
      });

      await tx.bankAccount.create({
        data: {
          householdId: household.id,
          name: "Checking",
          type: "checking",
          currentBalance: 0,
        },
      });

      await tx.category.createMany({
        data: SYSTEM_CATEGORIES.map((c) => ({
          householdId: household.id,
          ...c,
          isSystem: true,
        })),
      });

      return { user, household };
    });

    return NextResponse.json({ ok: true, userId: (result as { user: { id: string } }).user.id });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, BarChart2, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: TrendingUp },
  { href: "/budget", label: "Budget", icon: BarChart2 },
  { href: "/expenses", label: "Expenses", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({ reviewCount = 0 }: { reviewCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs relative",
                isActive
                  ? "text-slate-900 dark:text-slate-50"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {label === "Budget" && reviewCount > 0 && (
                <span className="absolute top-2 right-[calc(50%-18px)] bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                  {reviewCount > 9 ? "9+" : reviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  User,
  LogOut,
  Briefcase,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/search", label: "Recherche", icon: Search },
  { href: "/jobs", label: "Mes offres", icon: Bookmark },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav
      className="border-b border-slate-800 bg-slate-950 sticky top-0 z-50"
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-2 sm:px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-emerald-400 font-bold text-base sm:text-lg shrink-0"
          aria-label="Job Matcher — Accueil"
        >
          <Briefcase className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Job Matcher</span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 sm:px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">{item.label}</span>
                <span className="sr-only md:hidden">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-slate-400 hidden sm:inline truncate max-w-[150px]">
            {session.user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

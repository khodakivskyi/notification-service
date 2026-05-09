"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type Locale } from "@/lib/i18n";
import { getDocsByCategory } from "@/lib/docs";

interface DocsSidebarProps {
  lang: Locale;
}

export function DocsSidebar({ lang }: DocsSidebarProps) {
  const pathname = usePathname();
  const categories = getDocsByCategory();

  const categoryOrder = ["Core", "Development", "Operations"];

  return (
    <nav
      aria-label="Documentation navigation"
      className="flex flex-col gap-6 py-4"
    >
      {categoryOrder.map((category) => {
        const docs = categories[category];
        if (!docs) return null;
        return (
          <div key={category}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {category}
            </p>
            <ul className="flex flex-col gap-0.5">
              {docs.map((doc) => {
                const href = `/${lang}/docs/${doc.slug}`;
                const isActive = pathname === href;
                return (
                  <li key={doc.slug}>
                    <Link
                      href={href}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-secondary text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {doc.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

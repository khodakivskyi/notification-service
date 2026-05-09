"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Moon, Sun, Menu, X, GitBranch, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { type Locale, locales, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavbarProps {
  lang: Locale;
  hasChangelog?: boolean;
}

const GITHUB_URL = "https://github.com/khodakivskyi/notification-service";

export function Navbar({ lang, hasChangelog = true }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function switchLocale(next: Locale) {
    // Replace the current locale prefix in the path
    const segments = pathname.split("/");
    segments[1] = next;
    return segments.join("/") || `/${next}`;
  }

  const navItems = [
    { label: t(lang, "nav.overview"), href: `/${lang}` },
    { label: t(lang, "nav.docs"), href: `/${lang}/docs` },
    { label: t(lang, "nav.contributing"), href: `/${lang}/contributing` },
    ...(hasChangelog
      ? [{ label: t(lang, "nav.changelog"), href: `/${lang}/changelog` }]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === `/${lang}`) return pathname === `/${lang}`;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity shrink-0"
        >
          <Bell className="size-4 text-[var(--brand)]" aria-hidden="true" />
          <span className="font-mono text-sm">notification-service</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                isActive(item.href)
                  ? "text-foreground font-medium bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
            {locales.map((l) => (
              <Link
                key={l}
                href={switchLocale(l)}
                className={cn(
                  "px-2 py-1 rounded transition-colors",
                  l === lang
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l === "en" ? "EN" : "UK"}
              </Link>
            ))}
          </div>

          {/* GitHub */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            className="hidden sm:flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <GitBranch className="size-4" aria-hidden="true" />
          </a>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-colors",
                isActive(item.href)
                  ? "text-foreground font-medium bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-3 px-3">
            {locales.map((l) => (
              <Link
                key={l}
                href={switchLocale(l)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-xs px-2 py-1 rounded border border-border transition-colors",
                  l === lang
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l === "en" ? "English" : "Українська"}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitBranch className="size-3" aria-hidden="true" />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { type Locale, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  lang: Locale;
  className?: string;
}

export function SearchBar({ lang, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors",
          focused ? "border-ring ring-2 ring-ring/20" : "border-input"
        )}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t(lang, "search.placeholder")}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
          aria-label={t(lang, "search.placeholder")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* UI-only skeleton results panel */}
      {focused && query.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-popover p-4 shadow-md">
          <p className="text-sm text-muted-foreground">{t(lang, "search.noResults")}</p>
        </div>
      )}
    </div>
  );
}

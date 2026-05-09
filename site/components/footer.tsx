import Link from "next/link";
import { Bell, Github } from "lucide-react";
import { type Locale, t } from "@/lib/i18n";

interface FooterProps {
  lang: Locale;
}

const GITHUB_URL = "https://github.com/khodakivskyi/notification-service";

export function Footer({ lang }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="size-3.5 text-[var(--brand)]" aria-hidden="true" />
          <span className="font-mono font-medium text-foreground">notification-service</span>
          <span className="text-border">·</span>
          <span>{t(lang, "footer.builtWith")}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link
            href={`/${lang}/docs`}
            className="hover:text-foreground transition-colors"
          >
            {t(lang, "nav.docs")}
          </Link>
          <Link
            href={`/${lang}/contributing`}
            className="hover:text-foreground transition-colors"
          >
            {t(lang, "nav.contributing")}
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Github className="size-3.5" aria-hidden="true" />
            <span className="sr-only">GitHub</span>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

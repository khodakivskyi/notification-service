import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { isValidLocale, type Locale, t } from "@/lib/i18n";
import { getDocsByCategory } from "@/lib/docs";
import { Callout } from "@/components/callout";

interface DocsPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "uk" }];
}

export default async function DocsIndexPage({ params }: DocsPageProps) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  const categories = getDocsByCategory();
  const categoryOrder = ["Core", "Development", "Operations"];

  const isUk = locale === "uk";

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{t(locale, "nav.docs")}</span>
      </nav>

      {isUk && (
        <Callout type="note" className="mb-6">
          <strong>{t(locale, "docs.notTranslated")}</strong>
          {" "}{t(locale, "docs.notTranslated.desc")}
        </Callout>
      )}

      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
        Documentation
      </h1>
      <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
        Technical documentation for Notification Service v2 — an internal backend-to-backend
        (B2B) microservice for email notifications with queue-based processing and retries.
      </p>

      {categoryOrder.map((category) => {
        const docs = categories[category];
        if (!docs) return null;
        return (
          <section key={category} className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {docs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/${locale}/docs/${doc.slug}`}
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-ring/40 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-[var(--brand)] transition-colors">
                    {doc.title}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-[var(--brand)] transition-colors" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidLocale, type Locale, t } from "@/lib/i18n";
import { getDocPage, getAllDocSlugs, DOC_META } from "@/lib/docs";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Callout } from "@/components/callout";
import type { Metadata } from "next";

interface DocPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return ["en", "uk"].flatMap((lang) =>
    slugs.map((slug) => ({ lang, slug }))
  );
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = DOC_META[slug];
  return {
    title: meta?.title ?? slug,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { lang, slug } = await params;
  if (!isValidLocale(lang)) notFound();

  const doc = getDocPage(slug);
  if (!doc) notFound();

  const locale = lang as Locale;
  const isUk = locale === "uk";

  // Simple prev/next navigation
  const slugs = getAllDocSlugs();
  const currentIndex = slugs.indexOf(slug);
  const prevSlug = currentIndex > 0 ? slugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < slugs.length - 1 ? slugs[currentIndex + 1] : null;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/${locale}/docs`} className="hover:text-foreground transition-colors">
          {t(locale, "nav.docs")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{doc.title}</span>
      </nav>

      {isUk && (
        <Callout type="note" className="mb-6">
          <strong>{t(locale, "docs.notTranslated")}</strong>
          {" "}{t(locale, "docs.notTranslated.desc")}
        </Callout>
      )}

      <MarkdownRenderer content={doc.content} />

      {/* Prev / Next */}
      <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6">
        <div>
          {prevSlug && (
            <Link
              href={`/${locale}/docs/${prevSlug}`}
              className="group flex flex-col gap-0.5"
            >
              <span className="text-xs text-muted-foreground">Previous</span>
              <span className="text-sm font-medium text-foreground group-hover:text-[var(--brand)] transition-colors">
                ← {DOC_META[prevSlug]?.title}
              </span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {nextSlug && (
            <Link
              href={`/${locale}/docs/${nextSlug}`}
              className="group flex flex-col gap-0.5 items-end"
            >
              <span className="text-xs text-muted-foreground">Next</span>
              <span className="text-sm font-medium text-foreground group-hover:text-[var(--brand)] transition-colors">
                {DOC_META[nextSlug]?.title} →
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

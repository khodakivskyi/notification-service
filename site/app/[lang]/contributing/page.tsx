import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidLocale, type Locale, t } from "@/lib/i18n";
import { getContentFile } from "@/lib/docs";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Callout } from "@/components/callout";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "uk" }];
}

export const metadata: Metadata = {
  title: "Contributing",
};

export default async function ContributingPage({ params }: Props) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  const content = getContentFile("CONTRIBUTING");
  const isUk = locale === "uk";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{t(locale, "nav.contributing")}</span>
      </nav>

      {isUk && (
        <Callout type="note" className="mb-6">
          <strong>{t(locale, "docs.notTranslated")}</strong>
          {" "}{t(locale, "docs.notTranslated.desc")}
        </Callout>
      )}

      <MarkdownRenderer content={content} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { isValidLocale, type Locale } from "@/lib/i18n";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "uk" }];
}

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar lang={lang as Locale} hasChangelog />
      <main className="flex-1">{children}</main>
      <Footer lang={lang as Locale} />
    </div>
  );
}

import { type Locale } from "@/lib/i18n";
import { DocsSidebar } from "@/components/docs-sidebar";
import { SearchBar } from "@/components/search-bar";

interface DocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function DocsLayout({ children, params }: DocsLayoutProps) {
  const { lang } = await params;
  const locale = lang as Locale;

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-0">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-8">
          <div className="pt-4 pb-2">
            <SearchBar lang={locale} />
          </div>
          <DocsSidebar lang={locale} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

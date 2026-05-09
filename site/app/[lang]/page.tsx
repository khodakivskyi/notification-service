import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Zap,
  RefreshCw,
  Database,
  Webhook,
  HeartPulse,
  Shield,
  Terminal,
} from "lucide-react";
import { notFound } from "next/navigation";
import { isValidLocale, type Locale, t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ScrollRevealInit } from "@/components/scroll-reveal-init";

const GITHUB_URL = "https://github.com/khodakivskyi/notification-service";

const features = [
  { key: "feature1", icon: Zap },
  { key: "feature2", icon: RefreshCw },
  { key: "feature3", icon: Database },
  { key: "feature4", icon: Webhook },
  { key: "feature5", icon: HeartPulse },
  { key: "feature6", icon: Shield },
] as const;

const gettingStartedSteps = [
  {
    step: "1",
    title: "Use the CLI tool",
    code: "npx notification-service init",
    desc: "Interactive wizard to generate .env, docker-compose.yml, and verify your setup.",
  },
  {
    step: "2",
    title: "Or clone manually",
    code: "git clone https://github.com/khodakivskyi/notification-service.git && cd notification-service",
    desc: "Clone the repo, install dependencies, and configure your .env file.",
  },
  {
    step: "3",
    title: "Start dependencies",
    code: "docker-compose up -d",
    desc: "Spin up PostgreSQL and RabbitMQ with Docker Compose.",
  },
  {
    step: "4",
    title: "Run the service",
    code: "npm run dev && npm run dev:workers",
    desc: "Start the API server and worker processes. Database migrations run automatically.",
  },
  {
    step: "5",
    title: "Send your first notification",
    code: `curl -X POST http://localhost:3001/api/notifications/send \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","subject":"Hello","htmlContent":"<h1>It works!</h1>"}'`,
    desc: "The API queues the notification and returns an ID. Workers deliver it asynchronously.",
  },
];

interface HomePageProps {
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "uk" }];
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const locale = lang as Locale;

  return (
    <>
      <ScrollRevealInit />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Subtle grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 md:pt-28 md:pb-28">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-6 font-mono text-xs">
              {t(locale, "home.badge")}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance sm:text-5xl md:text-6xl">
              {t(locale, "home.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground text-pretty leading-relaxed">
              {t(locale, "home.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/docs`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {t(locale, "home.cta.docs")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/docs/setup`}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <Terminal className="size-3.5" aria-hidden="true" />
                {t(locale, "home.cta.quickstart")}
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <GitBranch className="size-3.5" aria-hidden="true" />
                {t(locale, "home.cta.github")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div data-reveal className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t(locale, "home.features.title")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t(locale, "home.features.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, icon: Icon }, i) => (
            <div
              key={key}
              data-reveal
              data-reveal-delay={String((i % 3) + 1)}
              className="rounded-lg border border-border bg-card p-5 hover:border-ring/40 transition-colors"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-secondary">
                <Icon className="size-4 text-[var(--brand)]" aria-hidden="true" />
              </div>
              <h3 className="mb-1.5 font-semibold text-foreground">
                {t(locale, `home.${key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(locale, `home.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Architecture ── */}
      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div data-reveal className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t(locale, "home.arch.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t(locale, "home.arch.subtitle")}
            </p>
          </div>

          <div data-reveal data-reveal-delay="1">
            <ArchitectureDiagram />
          </div>
        </div>
      </section>

      {/* ── Getting Started ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div data-reveal className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t(locale, "home.start.title")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t(locale, "home.start.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-4 max-w-3xl">
          {gettingStartedSteps.map((step, i) => (
            <div
              key={step.step}
              data-reveal
              data-reveal-delay={String(Math.min(i + 1, 5))}
              className="flex gap-4"
            >
              <div className="shrink-0 flex flex-col items-center">
                <div className="flex size-8 items-center justify-center rounded-full border border-border bg-background font-mono text-sm font-semibold text-muted-foreground">
                  {step.step}
                </div>
                {i < gettingStartedSteps.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-border" />
                )}
              </div>
              <div className="pb-8">
                <p className="font-semibold text-foreground mb-2">{step.title}</p>
                <p className="text-sm text-muted-foreground mb-3">{step.desc}</p>
                <div className="relative rounded-md border border-border bg-muted overflow-hidden">
                  <pre className="overflow-x-auto p-4 text-sm font-mono text-foreground">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-6">
          <Link
            href={`/${locale}/docs/setup`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand)] hover:opacity-80 transition-opacity"
          >
            View full setup guide
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}

function ArchitectureDiagram() {
  const steps = [
    { label: "Backend Services", sub: "Auth · Order · User", color: "bg-secondary border-border" },
    { label: "Notification API", sub: "Express.js + Validation", color: "bg-[var(--brand)]/10 border-[var(--brand)]/30" },
    { label: "RabbitMQ", sub: "Queue · Retry · DLQ", color: "bg-secondary border-border" },
    { label: "Worker", sub: "Email processing", color: "bg-secondary border-border" },
    { label: "SMTP Provider", sub: "Gmail · SendGrid · SES", color: "bg-secondary border-border" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6 overflow-x-auto">
      <div className="flex flex-col sm:flex-row items-center gap-0 min-w-fit mx-auto w-fit">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col sm:flex-row items-center">
            <div
              className={`rounded-lg border px-4 py-3 text-center min-w-[140px] ${step.color}`}
            >
              <p className="text-sm font-semibold text-foreground text-nowrap">{step.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 text-nowrap">{step.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="flex sm:flex-row flex-col items-center gap-0 my-1 sm:my-0 sm:mx-1">
                {/* Horizontal arrow on desktop */}
                <span className="hidden sm:block text-muted-foreground text-lg leading-none">→</span>
                {/* Vertical arrow on mobile */}
                <span className="sm:hidden text-muted-foreground text-lg leading-none">↓</span>
                {i === 1 && (
                  <>
                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground mx-1 whitespace-nowrap">
                      <span className="text-[var(--brand)]">+</span> PostgreSQL
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[var(--brand)]" aria-hidden="true" />
          Async queue delivery
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-amber-500/70" aria-hidden="true" />
          Retry on failure
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-muted-foreground/50" aria-hidden="true" />
          Status tracked in PostgreSQL
        </span>
      </div>
    </div>
  );
}

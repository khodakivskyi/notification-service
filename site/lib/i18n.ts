export const locales = ["en", "uk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isValidLocale(l: string): l is Locale {
  return (locales as readonly string[]).includes(l);
}

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav
    "nav.overview": "Overview",
    "nav.docs": "Docs",
    "nav.contributing": "Contributing",
    "nav.changelog": "Changelog",
    "nav.github": "GitHub",
    // Home
    "home.badge": "v2.0.0 — Now with CLI setup",
    "home.title": "notification-service",
    "home.subtitle":
      "Internal backend-to-backend notification microservice for sending email notifications with queue-based processing and retries.",
    "home.cta.docs": "Read the Docs",
    "home.cta.quickstart": "Quickstart",
    "home.cta.github": "View on GitHub",
    "home.features.title": "Built for reliability",
    "home.features.subtitle":
      "Everything you need to send notifications at scale — with confidence.",
    "home.feature1.title": "Queue-based Processing",
    "home.feature1.desc":
      "Async delivery via RabbitMQ decouples your API from email sending for maximum throughput.",
    "home.feature2.title": "Automatic Retries + DLQ",
    "home.feature2.desc":
      "Exponential backoff retries with Dead Letter Queue routing ensure no notification is lost.",
    "home.feature3.title": "Delivery Tracking",
    "home.feature3.desc":
      "Full lifecycle tracking in PostgreSQL: queued → sending → sent, with status check endpoints.",
    "home.feature4.title": "Webhook Callbacks",
    "home.feature4.desc":
      "Receive HTTP callbacks for delivery status updates in your calling services.",
    "home.feature5.title": "Health & Readiness",
    "home.feature5.desc":
      "Liveness and readiness endpoints for Kubernetes and Docker health checks.",
    "home.feature6.title": "API Key Auth + Rate Limiting",
    "home.feature6.desc":
      "Optional per-service API key authentication and Redis-based rate limiting.",
    "home.arch.title": "How it works",
    "home.arch.subtitle": "A simple, reliable pipeline from request to inbox.",
    "home.start.title": "Get started in minutes",
    "home.start.subtitle": "Two paths to running notification-service locally.",
    // Docs
    "docs.notTranslated": "This page is not yet translated into Ukrainian.",
    "docs.notTranslated.desc":
      "You are viewing the English version. To contribute a translation, see the Contributing guide.",
    "docs.onThisPage": "On this page",
    // Contributing
    "contributing.title": "Contributing",
    // Changelog
    "changelog.title": "Changelog",
    // Search
    "search.placeholder": "Search documentation...",
    "search.noResults": "No results found.",
    // Footer
    "footer.builtWith": "Built with Next.js · MIT License",
  },
  uk: {
    // Nav
    "nav.overview": "Огляд",
    "nav.docs": "Документація",
    "nav.contributing": "Внесок",
    "nav.changelog": "Журнал змін",
    "nav.github": "GitHub",
    // Home
    "home.badge": "v2.0.0 — Тепер із CLI налаштуванням",
    "home.title": "notification-service",
    "home.subtitle":
      "Внутрішній мікросервіс сповіщень для надсилання email-повідомлень із чергою та автоматичними повторними спробами.",
    "home.cta.docs": "Документація",
    "home.cta.quickstart": "Швидкий старт",
    "home.cta.github": "GitHub",
    "home.features.title": "Створено для надійності",
    "home.features.subtitle":
      "Все необхідне для надсилання сповіщень у масштабі — з впевненістю.",
    "home.feature1.title": "Обробка черги",
    "home.feature1.desc":
      "Асинхронна доставка через RabbitMQ відокремлює API від надсилання email для максимальної продуктивності.",
    "home.feature2.title": "Автоматичні повтори + DLQ",
    "home.feature2.desc":
      "Повторні спроби з експоненційним відступом і маршрутизацією до Dead Letter Queue забезпечують надійність доставки.",
    "home.feature3.title": "Відстеження доставки",
    "home.feature3.desc":
      "Повний трекінг у PostgreSQL: у черзі → надсилається → надіслано, з ендпоінтами перевірки статусу.",
    "home.feature4.title": "Webhook-зворотні виклики",
    "home.feature4.desc":
      "Отримуйте HTTP-зворотні виклики про статус доставки у ваших сервісах.",
    "home.feature5.title": "Health & Readiness",
    "home.feature5.desc":
      "Ендпоінти liveness та readiness для Kubernetes і Docker health checks.",
    "home.feature6.title": "API Key Auth + Rate Limiting",
    "home.feature6.desc":
      "Опціональна аутентифікація за API-ключем та обмеження запитів на основі Redis.",
    "home.arch.title": "Як це працює",
    "home.arch.subtitle": "Простий надійний конвеєр від запиту до поштової скриньки.",
    "home.start.title": "Почніть за кілька хвилин",
    "home.start.subtitle": "Два способи запустити notification-service локально.",
    // Docs
    "docs.notTranslated": "Ця сторінка ще не перекладена українською.",
    "docs.notTranslated.desc":
      "Ви переглядаєте англійську версію. Щоб додати переклад, перегляньте Посібник зі внеску.",
    "docs.onThisPage": "На цій сторінці",
    // Contributing
    "contributing.title": "Внесок у проєкт",
    // Changelog
    "changelog.title": "Журнал змін",
    // Search
    "search.placeholder": "Пошук у документації...",
    "search.noResults": "Результатів не знайдено.",
    // Footer
    "footer.builtWith": "Побудовано з Next.js · Ліцензія MIT",
  },
};

export function t(locale: Locale, key: string): string {
  return translations[locale][key] ?? translations["en"][key] ?? key;
}

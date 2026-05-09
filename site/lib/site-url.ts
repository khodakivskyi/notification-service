/** Canonical production URL for the docs / overview site. */
export const SITE_URL_PRODUCTION = "https://khodakivskyi-notification-service.vercel.app";

export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);
  return new URL(SITE_URL_PRODUCTION);
}

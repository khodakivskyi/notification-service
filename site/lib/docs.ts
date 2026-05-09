import fs from "fs";
import path from "path";

export interface DocMeta {
  slug: string;
  title: string;
  category: string;
}

export interface DocPage {
  slug: string;
  title: string;
  content: string;
  category: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content");
const DOCS_DIR = path.join(CONTENT_DIR, "docs");

// Maps slug → human title and category
export const DOC_META: Record<string, { title: string; category: string }> = {
  index: { title: "Documentation Home", category: "Core" },
  overview: { title: "System Architecture", category: "Core" },
  "api-design": { title: "API Design", category: "Core" },
  "api-examples": { title: "API Examples", category: "Core" },
  setup: { title: "Development Setup", category: "Development" },
  structure: { title: "Project Structure", category: "Development" },
  standards: { title: "Coding Standards", category: "Development" },
  database: { title: "Database Schema", category: "Operations" },
  "message-queue": { title: "Message Queue", category: "Operations" },
  deployment: { title: "Deployment", category: "Operations" },
};

export function getAllDocSlugs(): string[] {
  return Object.keys(DOC_META);
}

export function getDocPage(slug: string): DocPage | null {
  const filePath = path.join(DOCS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  const meta = DOC_META[slug] ?? { title: slug, category: "Other" };
  return { slug, content, title: meta.title, category: meta.category };
}

export function getContentFile(name: string): string {
  const filePath = path.join(CONTENT_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

export function getDocsByCategory(): Record<string, DocMeta[]> {
  const result: Record<string, DocMeta[]> = {};
  for (const [slug, meta] of Object.entries(DOC_META)) {
    if (!result[meta.category]) result[meta.category] = [];
    result[meta.category].push({ slug, title: meta.title, category: meta.category });
  }
  return result;
}

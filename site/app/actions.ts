"use server";

import { getDocsByCategory } from "@/lib/docs";

export async function fetchDocCategories() {
  return getDocsByCategory();
}

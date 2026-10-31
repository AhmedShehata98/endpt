import { PLACEHOLDER_PATTERN } from "./placeholder";

export function findPlaceholders(text: string): string[] {
  const keys = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    keys.add(match[1]!);
  }
  return [...keys];
}

import { cheatsheetEnUs, cheatsheetPtBr, type CheatsheetContent } from "./cheatsheet-content";

export function getCheatsheetContent(locale: string): CheatsheetContent {
  return locale === "en-US" ? cheatsheetEnUs : cheatsheetPtBr;
}

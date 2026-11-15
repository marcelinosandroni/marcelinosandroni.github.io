/**
 * The English stack variants, one module per document.
 *
 * ## Why this is a parallel set rather than a translation of the Portuguese one
 *
 * Because a translation rule set is a second answer to "what does this say", and the
 * two drift. The Portuguese variants are the source of truth; these are the same
 * variants written in English, and the build swaps them into the shell exactly as it
 * swaps the Portuguese ones in. The English document is therefore only ever as current
 * as the data here, and the swap asserts every section it replaces.
 *
 * ## Why one file per document
 *
 * `variants/<slug>-en.ts` is the English side of `variants/<slug>-br.ts`, so the two
 * halves of one document are one filename apart.
 *
 * ## Why `enterprise-java` declares no roles
 *
 * It is the one variant whose experience is the shared one, exactly as in Portuguese.
 * Declaring roles for it would be a second copy of the same sentences, and the moment
 * the shared experience changed, one of the two copies would be wrong with nothing to
 * say so. The other variants declare their own because they argue for a different
 * stack.
 */
import type { Variant } from "./variants/shared";
import { variant as enterpriseJava } from "./variants/enterprise-java-en";
import { variant as javaAzure } from "./variants/java-azure-en";
import { variant as enterpriseJavaReact } from "./variants/enterprise-java-react-en";
import { variant as enterpriseDotnet } from "./variants/enterprise-dotnet-en";
import { variant as enterpriseDotnetReact } from "./variants/enterprise-dotnet-react-en";
import { variant as csharpIa } from "./variants/csharp-ia-en";
import { variant as modernWeb } from "./variants/modern-web-en";
import { variant as javaIa } from "./variants/java-ia-en";
import { variant as pythonIa } from "./variants/python-ia-en";

export const VARIANTS_EN: ReadonlyArray<Variant> = [
  enterpriseJava,
  javaAzure,
  enterpriseJavaReact,
  enterpriseDotnet,
  enterpriseDotnetReact,
  csharpIa,
  modernWeb,
  javaIa,
  pythonIa,
];

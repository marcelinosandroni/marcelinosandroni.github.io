/**
 * The Brazilian Portuguese stack variants, one module per document.
 *
 * ## Why one file per document
 *
 * A variant is a page of prose, and a file that holds seven of them is a file
 * nobody can find the sentence they came for in. Each document now lives at
 * `variants/<slug>-br.ts`, named after the slug the build and the site use, so the
 * file you open is the file you are editing. This module is only the list, in the
 * order the selector shows them.
 *
 * ## What a variant does not carry
 *
 * The experience, the degrees, the languages and the contact details. All the
 * documents share them, in the shell, because the thing that makes them credible as
 * a set is that they are one set - and a variant that declared its own roles would
 * be a fifth place for a date to go stale in.
 *
 * ## What changes between variants
 *
 * The headline under the name, the summary, the four headline metrics, and the
 * technical inventory. Everything else is inherited.
 */
import type { Variant } from "./variants/shared";
import { variant as javaAzure } from "./variants/java-azure-br";
import { variant as enterpriseJava } from "./variants/enterprise-java-br";
import { variant as enterpriseJavaReact } from "./variants/enterprise-java-react-br";
import { variant as enterpriseDotnet } from "./variants/enterprise-dotnet-br";
import { variant as enterpriseDotnetReact } from "./variants/enterprise-dotnet-react-br";
import { variant as csharpIa } from "./variants/csharp-ia-br";
import { variant as modernWeb } from "./variants/modern-web-br";
import { variant as javaIa } from "./variants/java-ia-br";
import { variant as nodeIa } from "./variants/node-ia-br";
import { variant as pythonIa } from "./variants/python-ia-br";

export type { RoleContent, Variant } from "./variants/shared";
export { TIMELINE } from "./variants/shared";

export const variants: ReadonlyArray<Variant> = [
  javaAzure,
  enterpriseJava,
  enterpriseJavaReact,
  enterpriseDotnet,
  enterpriseDotnetReact,
  csharpIa,
  modernWeb,
  javaIa,
  nodeIa,
  pythonIa,
];

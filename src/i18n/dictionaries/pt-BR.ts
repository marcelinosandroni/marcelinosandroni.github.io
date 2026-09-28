import type { Dictionary } from "./en-US";

/**
 * Brazilian Portuguese (pt-BR) message catalog.
 *
 * Typed as `Dictionary`, so TypeScript rejects this file at build time if a key
 * is missing, misspelled or carries the wrong shape. The objective parity of
 * the resume *content* between locales is covered separately by the bilingual
 * content tests.
 */
export const ptBR: Dictionary = {
  metadata: {
    title: "Marcelino Sandroni Dias | Engenheiro de Software Sênior",
    jobTitle: "Engenheiro de Software Sênior",
    description:
      "Currículo vivo e interativo de Marcelino Sandroni Dias. Engenheiro de software sênior full stack especializado em sistemas distribuídos, arquitetura escalável e finanças corporativas.",
    siteName: "Marcelino Sandroni Dias — Currículo",
    openGraphDescription:
      "Currículo vivo de Marcelino Sandroni Dias, engenheiro de software sênior full stack.",
    structuredDataDescription:
      "Engenheiro de software sênior full stack que combina engenharia de ponta a 15 anos de experiência em negócios e contabilidade.",
    keywords: [
      "Marcelino Sandroni Dias",
      "Engenheiro de Software",
      "Engenheiro de Software Sênior",
      "Full Stack",
      "TypeScript",
      "Node.js",
      "Next.js",
      "React",
      ".NET",
      "C#",
      "Java",
      "Spring Boot",
      "Python",
      "Go",
      "Kubernetes",
      "Docker",
      "Cloud",
      "Microservices",
      "DDD",
    ],
    knowsAbout: [
      "Engenharia de Software",
      "Sistemas Distribuídos",
      "Computação em Nuvem",
      "DDD",
      "CQRS",
      "TypeScript",
      "C#",
      ".NET",
      "Java",
      "Go",
      "Python",
      "React",
      "Next.js",
    ],
  },
  nav: {
    backToTop: "Voltar ao início",
    mainNavigation: "Navegação principal",
    experience: "Experiência",
    skills: "Habilidades",
    education: "Formação",
  },
  hero: {
    liveResume: "Currículo vivo · v{version} · Atualizado em {period}",
    exploreTrajectory: "Explorar trajetória",
    getInTouch: "Entrar em contato",
    profileLabel: "Perfil profissional",
    note: "Engenharia que conecta sistemas distribuídos, produto e resultado financeiro.",
  },
  signal: {
    available: "Disponível para conversas",
    disciplines: "Backend · Frontend · Cloud · Arquitetura",
    localePair: "PT-BR / EN-US",
  },
  experience: {
    title: "Experiência",
    subtitle: "Uma trajetória entre tecnologia, operação e negócio.",
  },
  skills: {
    titleLead: "Ferramentas para",
    titleEmphasis: "resolver o complexo.",
    subtitle: "O repertório técnico é amplo. A escolha é sempre orientada pelo problema.",
  },
  education: {
    title: "Formação & Idiomas",
    subtitle: "Base acadêmica para decisões técnicas melhores.",
    languagesLabel: "Idiomas",
    languagesTitle: "Fluência bilíngue",
    languagesDescription: "Proficiência profissional completa em inglês e português nativo.",
  },
  footer: {
    tagline: "Vamos construir algo sólido.",
    versionedResume: "Currículo versionado",
  },
  pdf: {
    download: "Baixar PDF",
    generating: "Gerando…",
    failed: "Falha ao baixar PDF",
    unknownError: "Erro desconhecido",
    chooseTemplate: "Escolher modelo de PDF",
    /**
     * Seções impressas no PDF gerado. "Core Skills & Arquitetura de Software" é
     * intencional: o modelo REFERENCE reproduz os títulos do PDF de referência.
     */
    sections: {
      summary: "Resumo",
      skills: "Habilidades",
      experience: "Experiência",
      education: "Formação",
      languages: "Idiomas",
    },
    referenceSections: {
      summary: "Resumo Executivo",
      skills: "Core Skills & Arquitetura de Software",
      experience: "Experiência Profissional",
      education: "Formação Acadêmica & Certificações",
      languages: "Idiomas",
    },
    templates: {
      CLEAN: {
        label: "CLEAN",
        description: "Modelo editorial padrão",
      },
      REFERENCE: {
        label: "REFERENCE",
        description: "Modelo fiel ao PDF de referência",
      },
    },
  },
  localeSwitcher: {
    switchTo: "Ler este currículo em {language}",
  },
  notFound: {
    title: "Página não encontrada",
    description: "Este endereço não corresponde a nenhuma parte do currículo.",
    backHome: "Voltar para o currículo",
  },
};

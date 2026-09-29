import type { Dictionary } from "./en-US";

/**
 * Brazilian Portuguese (pt-BR) message catalog.
 *
 * Typed as `Dictionary`, so TypeScript rejects this file at build time if a key
 * is missing, misspelled or carries the wrong shape. The objective parity of the
 * resume *content* between locales is covered separately by the bilingual
 * content tests.
 */
export const ptBR: Dictionary = {
  metadata: {
    title: "Marcelino Sandroni Dias | Engenheiro de Software Sênior & Tech Lead",
    jobTitle: "Engenheiro de Software Sênior & Tech Lead",
    description:
      "Currículo vivo e interativo de Marcelino Sandroni Dias, engenheiro de software sênior e tech lead. Engenharia executiva em sistemas distribuídos, pipelines de IA e infraestrutura financeira, com R$ 24M/ano e 100M de mensagens/dia de impacto medido.",
    siteName: "Marcelino Sandroni Dias",
    openGraphDescription:
      "Engenheiro de Software Sênior & Tech Lead. Sistemas distribuídos, pipelines de IA e infraestrutura financeira — com impacto fiscal medido.",
    structuredDataDescription:
      "Engenheiro de software sênior full stack e tech lead que combina engenharia de ponta a 15 anos de experiência em finanças corporativas e contabilidade.",
    keywords: [
      "Marcelino Sandroni Dias",
      "Engenheiro de Software",
      "Engenheiro de Software Sênior",
      "Tech Lead",
      "Arquiteto de Software",
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
      "Sistemas Distribuídos",
      "DDD",
      "Apache Kafka",
      "ClickHouse",
    ],
    knowsAbout: [
      "Engenharia de Software",
      "Sistemas Distribuídos",
      "Computação em Nuvem",
      "DDD",
      "CQRS",
      "Arquitetura Hexagonal",
      "TypeScript",
      "C#",
      ".NET",
      "Java",
      "Go",
      "Python",
      "React",
      "Next.js",
      "Apache Kafka",
      "ClickHouse",
    ],
  },
  a11y: {
    skipToContent: "Pular para o conteúdo principal",
    mainContent: "Conteúdo principal",
    decorative: "Decorativo",
    opensInNewTab: "Abre em uma nova aba",
  },
  nav: {
    backToTop: "Voltar ao início",
    mainNavigation: "Navegação principal",
    experience: "Experiência",
    skills: "Habilidades",
    education: "Formação",
    home: "Visão geral",
    arsenal: "Arsenal",
    trackRecord: "Trajetória",
    blog: "blog",
    resume: "Currículo",
    contact: "Contato",
  },
  hero: {
    liveResume: "Currículo vivo · v{version} · Atualizado em {period}",
    note: "Engenharia que conecta sistemas distribuídos, produto e resultado financeiro.",
    backToOverview: "Voltar para a visão geral",
  },
  signal: {
    available: "Disponível para conversas",
  },
  experience: {
    title: "Experiência: Execução em Sistemas de Produção",
    subtitle: "Uma trajetória entre tecnologia, operação e negócio.",
    teamLabel: "Time",
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
  resume: {
    kicker: "// DOCUMENTO OFICIAL",
    title: "Currículo completo",
    subtitle:
      "Todos os cargos, entregas e resultados medidos, na íntegra. Esta página é o documento oficial; a visão geral é o resumo.",
    documentLabel: "Documento do currículo",
    technologiesLabel: "Tecnologias principais",
    scopeLabel: "Escopo",
    teamLabel: "Time",
    caseStudiesLabel: "Estudo de caso",
    problem: "Problema",
    solution: "Solução",
    result: "Resultado",
    backToOverview: "Voltar para a visão geral",
  },
  blog: {
    indexKicker: "// BLOG DE ENGENHARIA",
    indexTitle: "Whitepapers, benchmarks e notas de campo",
    indexSubtitle:
      "Textos longos sobre sistemas distribuídos, plataformas de dados e o ofício da liderança técnica.",
    allArticles: "Ler o blog",
    readingTime: "leitura de {minutes} min",
    publishedOn: "Publicado em",
    updatedOn: "Atualizado em",
    tagsLabel: "Tags",
    backToIndex: "Todos os artigos",
    emptyTitle: "Nenhum artigo publicado ainda",
    emptyDescription: "O primeiro whitepaper está sendo escrito. Volte em breve.",
    notFoundTitle: "Artigo não encontrado",
    notFoundDescription:
      "Este artigo não existe neste idioma ou foi removido de publicação.",
  },
  contact: {
      briefNote:
        "O WhatsApp abre a conversa com o contexto já sugerido; o e-mail abre um rascunho preenchido. Nada é enviado a partir desta página e não há formulário para preencher.",
  },
  boot: {
    skip: "Pular introdução",
    hint: "Pressione Enter para pular",
  },
  footer: {
    versionedResume: "Currículo versionado",
    legal: "Todos os direitos reservados.",
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
  copilot: {
    open: "Pergunte sobre a minha experiência",
    title: "Pergunte ao currículo",
    subtitle: "Respostas fundamentadas nesta página e no blog. Sem adivinhar.",
    placeholder: "Como você salvou os 24 milhões?",
    send: "Perguntar",
    thinking: "Buscando no currículo…",
    sourcesLabel: "Fontes",
    openLabel: "Abrir o copiloto do currículo",
    examplesLabel: "Experimente uma destas",
    examples: [
      "Como você salvou o contrato de 24 milhões?",
      "Qual sua experiência com Kafka?",
      "Fale sobre ClickHouse",
      "Como você lidera times de engenharia?",
    ],
    topMatch: "A partir de {label}:",
    nothingFound:
      "Nada neste currículo responde a isso. Respondo apenas a partir de conteúdo publicado, e prefiro dizer isso a inventar.",
    questionTooShort: "Escreva algo um pouco maior para que eu possa buscar.",
    questionTooLong: "Essa pergunta está longa demais. Fique em uma frase.",
    error: "Não foi possível acessar o copiloto. Tente novamente.",
  },
  admin: {
    accessLabel: "Acesso do dono",
    signInTitle: "Entrada do dono",
    signInDescription:
      "Esta área é restrita. Informe seu e-mail e enviaremos um link de acesso.",
    emailLabel: "Endereço de e-mail",
    emailPlaceholder: "voce@exemplo.com",
    submit: "Enviar meu link",
    sending: "Enviando…",
    sent: "Verifique sua caixa de entrada. O link expira em pouco tempo e só pode ser usado uma vez.",
    invalidEmail: "Isso não parece um endereço de e-mail válido.",
    notAllowed: "Este endereço não está autorizado neste site.",
    notConfigured:
      "O acesso do dono não está configurado neste deploy. Defina ADMIN_EMAIL, SUPABASE_URL e SUPABASE_SECRET_KEY.",
    unavailable:
      "O provedor de e-mail não está acessível a partir deste deploy. Nada foi enviado — tente de novo em instantes.",
    backToSite: "Voltar para o site",
    signOut: "Sair",
    signedInAs: "Conectado como {email}",
  },
  analytics: {
    panelLabel: "Visão geral de engajamento",
    open: "Ver o que os visitantes clicam",
    close: "Ocultar",
    title: "O que os visitantes clicam",
    subtitle: "Contagens agregadas por elemento. Sem coordenadas, sem IP, sem cookies, sem sessões.",
    empty: "Nenhum dado de clique coletado ainda.",
    total: "{count} cliques",
    unknownElement: "outros",
  },
  telemetry: {
    label: "Métricas reais de carregamento desta página",
    ttfb: "TTFB",
    domContentLoaded: "DOM pronto",
    loadComplete: "Carregado",
    unavailable: "não mensurável neste navegador",
  },
};

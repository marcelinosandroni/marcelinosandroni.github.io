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
  /**
   * Atribuição de um still licenciado na camada de arte de uma seção
   * (`docs/section-artwork.md`).
   *
   * A única string visível da camada. A camada em si é `aria-hidden`, mas um still
   * de filme é uso de obra autoral de terceiros e atribuição não é decoração nem
   * detalhe — então o crédito é texto normal, legível e traduzido como todo o
   * resto. Só aparece quando há imagem configurada: a placa gerada é arte original
   * e não deve crédito a ninguém.
   */
  artwork: {
    credit: "Imagem: {title} — {rights}.",
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
    themeLabel: "TEMA",
    legal: "Todos os direitos reservados.",
  },

  soundtrack: {
    start: "Ativar a trilha sonora",
    stop: "Silenciar a trilha sonora",
  },

  /**
   * A única pergunta que este site faz a quem lê. A redação importa: curta o
   * bastante para ser lida de passagem, e "continua usando" em vez de "gostou"
   * porque a resposta é sobre comportamento, não sobre sentimento.
   */
  feedback: {
    question: "Temas novos. Seguindo com este?",
    keep: "Manter",
    unsure: "Talvez",
    leave: "Prefiro outro",
    dismiss: "Dispensar a pergunta",
  },

  /**
   * Os easter eggs ocasionais do tema Matrix.
   *
   * Cinco ovos, e quatro deles são silenciosos — o glitch, a chuva invertida e a
   * chuva congelada não dizem nada, e estão aqui justamente porque um efeito que
   * fala é uma interrupção. As chaves abaixo são toda a parte falada: uma linha
   * de status, uma frase de tomada de tela, uma linha baixa, uma dica de tecla e
   * um botão.
   *
   * `documento oficial` mantém o vocabulário do próprio site (`og.siteKicker`),
   * então o glitch continua sendo uma piada sobre o documento que a página
   * apresenta, e não sobre o filme.
   */
  easterEgg: {
    dismiss: "Dispensar",
    glitchStatus: "// DECODIFICANDO O REGISTRO",
    whitePill: "Tudo o que você leu até agora foi um aperto de mãos.",
    whitePillHint: "Esc para continuar",
    wakeUp: "Acorde. Este currículo está carregando há quinze anos.",
  },

  /**
   * A página `/eastereggs`, que existe porque as regras de disparo tornam os
   * efeitos realmente difíceis de ver de outro jeito.
   */
  easterEggs: {
    title: "Todos os efeitos, sob demanda",
    intro:
      "Cinco ovos disparam no máximo uma vez por visita, numa janela depois de você ler por um tempo, e apenas no tema matrix. Esta página mostra cada um e declara as regras, para que o comportamento fique visível em vez de ser lenda.",
    replay: "Repetir",
    rulesHeading: "As regras",
    back: "Voltar",
    clear: "Limpar seleção",
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
      teamSize: "Equipe de {n}",
      stack: "Stack",
      challenge: "Desafio",
      solution: "Resposta",
      result: "Resultado",
    },
    referenceSections: {
      summary: "Resumo Executivo",
      skills: "Core Skills & Arquitetura de Software",
      experience: "Experiência Profissional",
      education: "Formação Acadêmica & Certificações",
      languages: "Idiomas",
      teamSize: "Equipe de {n}",
      stack: "Stack",
      challenge: "Desafio",
      solution: "Resposta",
      result: "Resultado",
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
    placeholder: "Como você salvou o contrato de 24 milhões?",
    closeLabel: "Fechar o terminal",
    exitHint: "exit, Esc ou Ctrl+C para sair",
    welcome:
      "Baseado apenas no currículo publicado. Digite uma pergunta ou escolha uma abaixo. Nada aqui é inferido — se o conteúdo não sustenta a resposta, ele diz isso.",
    send: "Perguntar",
    thinking: "Buscando no currículo…",
    sourcesLabel: "Fontes",
    openLabel: "Abrir o terminal do currículo",
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
  /**
   * A conversa do visitante.
   *
   * O visitante não recebe esta oferta. O dono abre a conversa primeiro, e só
   * então aparece um widget — então a maior parte de quem lê este site nunca vê
   * uma palavra disto, que é justamente o ponto: uma caixa de conversa em cada
   * página é um convite a escrever para um desconhecido, e a resposta seria
   * conteúdo que este site passaria a guardar.
   *
   * `agentNotice` e `agentReply` são as duas metades da resposta automática, e
   * ambas estão aqui e não no código porque ambas são ditas a um desconhecido. O
   * aviso é um rótulo renderizado *acima* da mensagem e lido por um leitor de
   * tela; a resposta diz na primeira pessoa que é uma máquina. Nenhuma das duas
   * pode ser confundida com o dono, e o domínio recusa construir a mensagem sem o
   * aviso.
   */
  chat: {
    title: "Linha direta",
    open: "Fale comigo",
    openLabel: "Abrir a linha direta",
    closeLabel: "Fechar a conversa",
    sendLabel: "Enviar a mensagem",
    placeholder: "Escreva uma mensagem…",
    transcriptLabel: "Conversa",
    messageLabel: "Sua mensagem",
    privacyNote:
      "Guardado: um id aleatório neste navegador e a última vez que ele foi visto. Não guardado: seu endereço, seu dispositivo, o tamanho da sua tela, sua impressão digital.",
    exitHint: "Esc ou um clique fora fecha isto",
    waiting: "Enviada. Marcelino ainda não respondeu.",
    youLabel: "Você",
    ownerLabel: "Marcelino",
    agentNotice: "RESPOSTA AUTOMÁTICA — não é uma pessoa",
    agentReply:
      "Sou o Agente Smith: um substituto automático, não o Marcelino. Sua mensagem chegou à mesa e esta resposta é a fila confirmando o recebimento. Se for importante, espere a pessoa nesta conversa em breve.",
    failed: "A mensagem não foi enviada. Tente de novo.",
    rateLimited: "Mensagens demais. Tente de novo em {seconds}s.",
    withdrawn: "Esta conversa foi encerrada.",
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
    /**
     * The sign-in email itself.
     *
     * `{link}` is filled in by the delivery adapter, which is the only party
     * that knows the one-time link — see `MAGIC_LINK_PLACEHOLDER` in the domain.
     */
    email: {
      magicLinkSubject: "Seu link de acesso",
      magicLinkBody: `Use este link para entrar no seu site. Ele expira em pouco tempo e só pode ser usado uma vez.

{link}

Se você não pediu este link, ignore esta mensagem — nada foi alterado.`,
    },
    /**
     * The blog CMS.
     *
     * One entry per `PostIssueCode`, and the domain returns codes rather than
     * sentences precisely so this table is the only place a reason is written
     * down. Every key here exists because a string is needed; none of them is
     * a translation of a message the English catalog happens to have.
     */
    posts: {
      sectionTitle: "CMS do blog",
      sectionDescription:
        "Escreva um post em Markdown. Publicar compila o texto no mesmo artigo que o blog já renderiza, então nada aqui é um segundo tipo de página.",
      listLabel: "Seus posts",
      newPost: "Novo post",
      empty: "Nenhum post ainda.",
      loadFailed:
        "Não foi possível acessar o CMS. Verifique se a migração blog_post_cms foi aplicada e se SUPABASE_SECRET_KEY está definida.",
      statusLabel: "Situação",
      statusDraft: "Rascunho",
      statusPublished: "Publicado",
      statusArchived: "Arquivado",
      localeEnUS: "Inglês",
      localePtBR: "Português",
      formLabel: "Dados do post",
      createTitle: "Novo post",
      editTitle: "Editando {title}",
      edit: "Editar",
      fieldTitle: "Título",
      fieldSlug: "Slug",
      fieldSlugHint: "Deixe em branco para gerar a partir do título.",
      fieldLocale: "Idioma",
      fieldCategory: "Categoria",
      fieldExcerpt: "Resumo",
      fieldExcerptHint:
        "Uma ou duas frases. Vira a descrição da página e o que buscadores exibem.",
      fieldTags: "Tags",
      fieldTagsHint: "Separadas por vírgula.",
      fieldFeatured: "Destacar na página inicial",
      fieldPublishedAt: "Data de publicação",
      fieldBody: "Corpo (Markdown)",
      bodyHint:
        "Linha em branco entre blocos. ## e ### para títulos, - para lista, 1. para lista numerada, > para citação, três crases para código e ::: para callout.",
      bodySafetyNote:
        "HTML bruto não é renderizado. Qualquer coisa que pareça uma tag aparece como o texto digitado.",
      inlineFormattingNote:
        "Negrito, itálico e links ainda não são suportados e permanecem como os caracteres digitados.",
      wordCount: "{count} palavras",
      estimatedReading: "Cerca de {minutes} min de leitura",
      previewLabel: "Pré-visualização",
      previewEmpty: "Escreva algo e a pré-visualização aparece aqui.",
      save: "Salvar rascunho",
      saving: "Salvando…",
      cancel: "Cancelar",
      publish: "Publicar",
      withdraw: "Arquivar",
      restore: "Restaurar e publicar",
      remove: "Excluir",
      removeConfirm: "Confirmar exclusão",
      removeCancel: "Manter",
      removing: "Excluindo…",
      removeWarning:
        "Excluir remove o artigo do blog. O Markdown vai junto e não pode ser recuperado por aqui.",
      savedDraft: "Salvo como rascunho.",
      savedPublished: "Salvo e republicado.",
      published: "Publicado. O post está no blog.",
      archived: "Arquivado. O post saiu do blog e o texto foi mantido.",
      restored: "Restaurado e publicado.",
      removed: "Post excluído.",
      failed: "O post não foi salvo. Nada foi alterado.",
      slugTaken: "Esse slug já está em uso por outro post neste idioma.",
      issuesLabel: "Corrija isto antes de salvar",
      viewOnBlog: "Ver no blog",
      issues: {
        document_unreadable: "Não foi possível ler o post. Envie novamente.",
        front_matter_missing:
          "O documento precisa começar com uma linha ---, seguido dos campos e de outra linha ---.",
        front_matter_unterminated: "Falta o --- que fecha os campos.",
        front_matter_line_invalid: "Esta linha não é um campo. Use `nome: valor`.",
        front_matter_key_unknown: "{field} não é um campo que este editor conheça.",
        front_matter_key_repeated: "{field} aparece mais de uma vez.",
        front_matter_key_missing: "{field} está faltando.",
        value_not_a_string: "{field} precisa ser um valor único, não uma lista.",
        value_required: "{field} é obrigatório.",
        value_too_long: "{field} é longo demais.",
        value_not_a_boolean: "{field} precisa ser true ou false.",
        value_not_a_list: "{field} precisa ser uma lista separada por vírgulas.",
        value_not_a_date: "{field} precisa ser uma data no formato AAAA-MM-DD.",
        slug_invalid:
          "O slug precisa ser palavras minúsculas separadas por um hífen, sem acentos nem espaços.",
        locale_unknown: "Escolha um dos idiomas publicados.",
        category_unknown: "Escolha uma categoria da lista.",
        tags_too_many: "Tags demais.",
        body_empty: "O corpo está vazio.",
      },
    },
    /**
     * O painel de presença e a metade do dono na conversa.
     *
     * `availabilityAnswering` e companhia nomeiam os três estados de
     * `OwnerActivityState` em vez de descrevê-los, para que o rótulo e a regra não
     * possam divergir: "Respondendo" aparece exatamente quando `canOwnerAnswer` é
     * verdadeiro.
     *
     * As strings de "visto por último" são relativas porque um carimbo absoluto
     * num painel ao vivo é lido como "quando eu olhei esta página". Três
     * granularidades em vez de uma data formatada, porque um painel que mostra
     * "27/09/2026 14:02:11" para quem está online *agora* enterrou o único fato
     * que ele existe para transmitir.
     */
    chat: {
      sectionTitle: "Quem está lendo",
      sectionDescription:
        "Visitantes anônimos no site agora, e as conversas que você iniciou. Um id aleatório e a última vez que foi visto — sem endereço, sem dispositivo, sem impressão digital, sem cookie.",
      online: "{count} online",
      onlineNone: "Ninguém está lendo",
      lastSeenNow: "agora mesmo",
      lastSeenMinutes: "há {minutes}m",
      lastSeenHours: "há {hours}h",
      visitorsLabel: "Visitantes",
      noVisitors: "Nenhum visitante enviou sinal nas últimas 24 horas.",
      availabilityLabel: "Você está",
      availabilityAnswering: "respondendo",
      availabilityIdle: "ocioso",
      availabilitySignedOut: "desconectado",
      availabilityHint:
        "Respondendo enquanto esta página estiver aberta e sendo olhada, ocioso após uma hora de silêncio, desconectado no instante em que sua sessão terminar.",
      startChat: "Iniciar uma conversa",
      reopenChat: "Abrir de novo",
      openTranscript: "Ler a transcrição",
      started: "Conversa iniciada. O widget da pessoa acabou de aparecer.",
      closeChat: "Parar de responder",
      closeChatWarning: "Parar de responder mantém a transcrição. O visitante não recebe nada.",
      conversationLabel: "Conversa com {session}",
      replyPlaceholder: "Responder…",
      sendReply: "Responder",
      transcriptLabel: "Transcrição",
      emptyConversation: "Nenhuma mensagem ainda.",
      stateLabel: "Situação",
      stateUnopened: "Não iniciada",
      stateOpen: "Aberta",
      stateClosed: "Encerrada",
      youLabel: "Você",
      visitorLabel: "Visitante",
      failed: "Não foi possível. Nada foi alterado.",
      rateLimited: "Mensagens demais. Tente de novo em {seconds}s.",
      sessionEnded: "Sua sessão terminou. Recarregue a página para entrar de novo.",
      loadFailed:
        "Não foi possível acessar o console. Verifique se a migração presence_and_chat foi aplicada e se SUPABASE_SECRET_KEY está definida.",
    },
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
    /*
      Deliberadamente sem traduzir, e sem virar prosa.

      `TTFB`, `DOM` e `load` são os nomes que o próprio navegador usa para esses três
      eventos — é o que aparece no painel do DevTools e em qualquer conversa sobre
      performance desta página que alguém venha ter. Traduzir tornaria a barra
      ilegível para a única pessoa que provavelmente vai conferir se os números são
      reais, que é a pessoa para quem a barra existe.

      `DOM pronto` e `Carregado` eram a redação anterior e estavam errados duas vezes:
      traduziam longe dos nomes dos eventos, e eram longos o bastante para que em
      390px a barra quebrasse em três linhas para dizer a mesma coisa com mais
      palavras.
     */
    ttfb: "TTFB",
    domContentLoaded: "DOM",
    loadComplete: "load",
    unavailable: "não mensurável neste navegador",
    /*
      Tooltip do carimbo de build à direita da barra, dizendo o que o número é em vez
      de repeti-lo. Existe porque o carimbo é UTC, tem granularidade de minuto e não
      significa nada para quem não sabe que é uma hora de build — e "build" sozinho
      se lê como substantivo, não como verbo: build de quê.
    */
    buildTitle: "Este deploy foi construído às",
  },
  /**
   * Cartões Open Graph — a imagem 1200x630 que uma rede social mostra quando um
   * link é compartilhado, e o `og:image:alt` que a acompanha. O `monogram` é
   * igual em todos os idiomas de propósito: é a marca, e traduzir uma marca é
   * rebatizá-la.
   */
  og: {
    monogram: "MSD",
    siteKicker: "// DOCUMENTO OFICIAL",
    alt: "Marcelino Sandroni Dias — Engenheiro de Software Sênior & Tech Lead",
    articleAlt: "Artigo do blog por Marcelino Sandroni Dias",
    categories: {
      "distributed-systems": "Sistemas Distribuídos",
      "data-platforms": "Plataformas de Dados",
      leadership: "Liderança",
      "ai-ml": "IA & ML",
      fintech: "Fintech",
    },
  },
};

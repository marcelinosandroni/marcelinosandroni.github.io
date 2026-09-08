import type { ResumeContent } from "@/domain/resume/types";

export const resumeContentEnUs: ResumeContent = {
  locale: "en-US",
  name: "Marcelino Sandroni Dias",
  title: "Senior Software Engineer",
  location: "Fortaleza, CE, Brazil · Remote",
  contact: {
    phone: "+55 11 91446-1993",
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary:
    "Senior Full Stack Software Engineer combining cutting-edge engineering with 15 years of solid experience in business and accounting. Expert in translating complex corporate financial rules into scalable web architectures, high-volume distributed systems, and products that maximize financial profitability while solving real operational pain points.",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Senior Software Engineer",
      period: "Jan/2026 – Present",
      location: "Remote",
      summary: "Modernizing legacy systems and orchestrating high-volume microservices.",
      highlights: [
        "C# (.NET), Go, Node.js, CQRS and event-driven architecture",
        "RabbitMQ, Circuit Breaker and DLQs for 10 million messages/day",
        "DevOps/SRE, zero-downtime CI/CD, Kubernetes, Helm, HPA and Terraform",
        "Angular, React Native, micro-frontends and Core Web Vitals optimization",
      ],
    },
    {
      company: "Antlia",
      role: "Senior Software Engineer",
      period: "Dec/2022 – Dec/2025",
      location: "Remote",
      summary: "Leading web development for the financial sector.",
      highlights: [
        "Angular, React, Next.js and complex state management",
        "DDD microservices in Java Spring Boot and C# .NET Core",
        "AWS, Azure and infrastructure as code with Terraform",
      ],
    },
    {
      company: "Banco Itaú",
      role: "Software Engineer",
      period: "Mar/2022 – Nov/2022",
      location: "Hybrid",
      summary: "Driving Clean Code and TDD adoption in highly available microservices.",
      highlights: ["C# and Java integrated with message brokers", "Vulnerability mitigation and test coverage evolution"],
    },
    {
      company: "Pollux Technologies",
      role: "Software Engineer",
      period: "Jun/2021 – Jan/2022",
      location: "Remote",
      summary: "Architecting microservices, serverless applications and interfaces for startups.",
      highlights: ["TypeScript, NestJS, RESTful and GraphQL APIs", "React and Flutter"],
    },
    {
      company: "Accounting Consulting Firms",
      role: "Accounting Analyst & Manager",
      period: "Jan/2005 – Dec/2020",
      location: "São Paulo",
      summary:
        "Digital transformation and operational restructuring of companies through accounting process automation, strategic financial management, and team leadership. Acted as bridge between business and technology, implementing solutions that reduced operating costs by 83% and freed working capital for strategic investments.",
      highlights: [
        "Reduced accounting closing cycle from 30 days to 5 days (83% faster) through manual process automation.",
        "Saved R$ 200K/year in operating costs and eliminated manual rework across multiple companies.",
        "Generated R$ 2M in new investments through strategic capital allocation consulting.",
        "Reduced up to R$ 1M annually in taxes through advanced tax planning and strategic accounting reclassification.",
        "Freed 20+ employees for higher-value activities through operational routine automation.",
        "Implemented remote work and real-time dashboards, increasing productivity and team satisfaction.",
        "5x operational performance multiplier, enabling reallocation to complex issues and portfolio expansion.",
        "Integrated accounting systems with clients, automating information exchange and reducing manual errors by 95%.",
      ],
      caseStudies: [
        {
          title: "Accounting Closing Automation: From 30 to 5 Days",
          challenge:
            "Companies faced a 30-day accounting closing cycle, requiring intensive manual effort from 20+ employees, causing decision-making delays, late filing penalties, and inability to provide real-time financial reports to managers.",
          solution:
            "Developed and implemented integrated accounting automation system with: (1) Direct API integration between client systems and accounting platform, eliminating manual data entry; (2) Automated business rules for accounting classification based on history and patterns; (3) Real-time dashboards with critical financial KPIs; (4) Automated approval workflows with intelligent notifications; (5) Dynamic financial spreadsheets with custom macros for specific client scenarios.",
          result:
            "83% reduction in closing time (30 → 5 days), freed 20 employees for strategic activities, annual savings of R$ 200K in operating costs, eliminated 95% of manual errors, and increased client satisfaction with real-time reporting.",
          metrics: [
            { label: "Process Time Reduction", value: "30 days → 5 days", icon: "time" },
            { label: "Annual Cost Savings", value: "R$ 200,000", icon: "money" },
            { label: "Employees Reallocated", value: "20+ people", icon: "people" },
            { label: "Manual Error Reduction", value: "95%", icon: "performance" },
            { label: "Performance Multiplier", value: "5x", icon: "performance" },
          ],
        },
        {
          title: "Strategic Tax Planning: R$ 1 Million Savings",
          challenge:
            "Clients paid excessive taxes due to inadequate accounting classification, lack of knowledge about optimal tax regimes, and absence of strategic tax planning, resulting in competitive loss and reduced profit margins.",
          solution:
            "Implemented deep accounting review methodology with: (1) Detailed analysis of all operations and strategic accounting reclassification; (2) Migration to more advantageous tax regimes (Actual Profit vs. Presumed); (3) Leverage of regional and sectoral tax benefits; (4) Operations structuring for legal tax burden optimization; (5) Continuous monitoring of legislative changes with proactive strategy adjustments.",
          result:
            "Accumulated savings of up to R$ 1 million in taxes per client/year, 8-12% net margin increase, significant improvement in market competitiveness, and resources freed for reinvestment in growth and innovation.",
          metrics: [
            { label: "Annual Tax Savings", value: "Up to R$ 1,000,000", icon: "money" },
            { label: "Net Margin Increase", value: "8-12%", icon: "money" },
            { label: "Benefited Clients", value: "Multiple", icon: "people" },
          ],
        },
        {
          title: "Investment Consulting: R$ 2 Million in Strategic Applications",
          challenge:
            "Companies kept idle capital in non-interest-bearing checking accounts, lacked knowledge of suitable investment options for their risk profile, and had no cash management policy, resulting in lost growth opportunities and financial fragility.",
          solution:
            "Structured strategic financial management process with: (1) Complete cash flow and available capital diagnosis; (2) Investment policy definition aligned with risk profile and liquidity needs; (3) Diversification into optimized financial applications (CDB, LCI/LCA, funds, treasury direct); (4) Long-term financial projections with optimistic, pessimistic, and realistic scenarios; (5) Monthly follow-up meetings and portfolio rebalancing.",
          result:
            "Strategic allocation of R$ 2 million in high-yield investments, generation of additional financial revenue of 12-15% per year, strengthened working capital, and created reserve for strategic expansions and acquisitions.",
          metrics: [
            { label: "Capital Strategically Invested", value: "R$ 2,000,000", icon: "money" },
            { label: "Annual Yield Obtained", value: "12-15% p.a.", icon: "money" },
            { label: "Companies with Professional Management", value: "Multiple", icon: "people" },
          ],
        },
        {
          title: "Digital Transformation and Remote Work",
          challenge:
            "Teams stuck to manual processes, disconnected spreadsheets, and fragmented communication, with low productivity, resistance to technological change, and impossibility of remote work even for administrative functions.",
          solution:
            "Led complete digital transformation with: (1) Implementation of integrated cloud-based systems; (2) Creation of unified dashboards with real-time KPIs; (3) Automation of approval flows and notifications; (4) Intensive training in digital tools and new methodologies; (5) Establishment of data-driven culture with metrics-based meetings; (6) Gradual implementation of remote work with collaboration tools.",
          result:
            "Complete operations modernization, successful remote work implementation for administrative functions, 40% increase in team productivity, improved organizational climate, and talent attraction through offered flexibility.",
          metrics: [
            { label: "Productivity Increase", value: "40%", icon: "performance" },
            { label: "Functions Converted to Remote", value: "Multiple areas", icon: "people" },
            { label: "Systems Implemented", value: "Integrated Cloud-based", icon: "performance" },
          ],
        },
      ],
      technologies: [
        "Integrated Accounting Systems",
        "Integration APIs",
        "Financial Dashboards",
        "Advanced Spreadsheets (Macros/VBA)",
        "Automation Tools",
        "Cloud Platforms",
        "ERP Management Systems",
      ],
      teamSize: 20,
      scope: "Multiple companies of different sizes and sectors, acting in accounting, tax, financial, and people management consulting",
    },
  ],
  skillGroups: [
    { label: "Backend", skills: ["C# / .NET", "Java / Spring Boot", "Node.js / NestJS", "TypeScript", "Python", "Go"] },
    { label: "Frontend & Mobile", skills: ["React", "Next.js", "Angular", "Flutter", "React Native", "Redux", "Zustand"] },
    { label: "Architecture", skills: ["Microservices", "DDD", "CQRS", "Clean Architecture", "API Gateway", "BFF", "Event-Driven"] },
    { label: "Data & AI", skills: ["PostgreSQL", "SQL Server", "ClickHouse", "Redis", "Kafka", "RabbitMQ", "RAG"] },
    { label: "Cloud & SRE", skills: ["AWS", "Azure", "GCP", "Kubernetes", "Docker", "Terraform", "CI/CD"] },
    { label: "Quality & Security", skills: ["TDD", "Playwright", "Cypress", "K6", "OAuth 2.0", "OIDC", "JWT"] },
  ],
  education: [
    { title: "Computer Engineering", institution: "UNIVESP", period: "Jul/2021 – Jul/2025", description: "Computer architecture, artificial intelligence and advanced data structures." },
    { title: "Accounting Sciences", institution: "Estácio", period: "2017", description: "Corporate accounting, governance and financial analysis." },
    { title: "Master of Computer Applications (Full Stack)", institution: "Labenu", period: "2021", description: "Clean Code, automated testing and component architecture." },
    { title: "CSx50 (Computer Science)", institution: "Harvard University", period: "2021", description: "Fundamentals of computer science, algorithms and discrete mathematics." },
  ],
  languages: ["Portuguese · Native", "English · Professional"],
};

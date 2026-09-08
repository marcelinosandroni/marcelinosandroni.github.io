export const resumeLatexTemplate = ({
  templateId,
  name,
  title,
  location,
  phone,
  email,
  linkedin,
  version,
  locale,
  body,
}: {
  templateId: string;
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  version: string;
  locale: string;
  body: string;
}) => {
  const isReference = templateId === "REFERENCE";
  const margin = isReference ? "0.60in" : "0.68in";
  const fontSize = isReference ? "10.5pt" : "10pt";
  const nameSize = isReference ? "22" : "24";
  const titleSize = isReference ? "12" : "13";
  const accentColor = isReference ? "95,99,96" : "129,144,35";

  return String.raw`
\documentclass[${fontSize},a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=${margin}]{geometry}
\usepackage{enumitem}
\usepackage{tabularx}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{titlesec}
\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{3pt}
\definecolor{ink}{RGB}{23,33,29}
\definecolor{muted}{RGB}{95,99,96}
\definecolor{accent}{RGB}{${accentColor}}
\hypersetup{colorlinks=true,urlcolor=ink}
\titleformat{\section}{\large\bfseries\color{ink}}{}{0pt}{}[\vspace{-4pt}\textcolor{accent}{\rule{\linewidth}{0.7pt}}]
\titlespacing*{\section}{0pt}{8pt}{4pt}
\setlist[itemize]{leftmargin=1.2em,itemsep=1pt,topsep=2pt,parsep=0pt}

\begin{document}
\color{ink}
\begin{center}
{\fontsize{${nameSize}}{26}\selectfont\bfseries ${name}}\\[3pt]
{\fontsize{${titleSize}}{15}\selectfont ${title}}\\[4pt]
{\small ${location} \textbar{} ${phone} \textbar{} ${email} \textbar{} \href{https://${linkedin}}{${linkedin}}}
\end{center}

\vspace{4pt}
${body}

\vfill
\begin{center}
{\scriptsize\color{muted} ${locale} \textbar{} v${version}}
\end{center}
\end{document}
`;
};

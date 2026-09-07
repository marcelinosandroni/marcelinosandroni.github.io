export const resumeLatexTemplate = ({
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
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  version: string;
  locale: string;
  body: string;
}) => String.raw`
\documentclass[10pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=0.68in]{geometry}
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
\definecolor{accent}{RGB}{129,144,35}
\hypersetup{colorlinks=true,urlcolor=ink}
\titleformat{\section}{\large\bfseries\color{ink}}{}{0pt}{}[\vspace{-4pt}\textcolor{accent}{\rule{\linewidth}{0.7pt}}]
\titlespacing*{\section}{0pt}{8pt}{4pt}
\setlist[itemize]{leftmargin=1.2em,itemsep=1pt,topsep=2pt,parsep=0pt}

\begin{document}
\color{ink}
\begin{center}
{\fontsize{24}{28}\selectfont\bfseries ${name}}\\[3pt]
{\fontsize{13}{16}\selectfont ${title}}\\[4pt]
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

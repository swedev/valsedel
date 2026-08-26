export type ElectionType = "riksdag" | "region" | "kommun" | "eu";

export interface Candidate {
  nummer: number;
  fornamn: string;
  efternamn: string;
  info?: string;
}

export interface PartyChoice {
  partibeteckning: string;
  partisymbol?: string;
  kandidat?: Candidate;
}

export interface BallotData {
  electionType: ElectionType;
  valkrets: string;
  partier: PartyChoice[];
  listtypKod?: string;
  valkretskod?: string;
}

const BALLOT_COLORS: Record<ElectionType, { rgb: string }> = {
  riksdag: { rgb: "255, 255, 200" },
  region: { rgb: "200, 225, 245" },
  kommun: { rgb: "255, 255, 255" },
  eu: { rgb: "255, 255, 255" },
};

const SIGNAL_LINES: Record<ElectionType, number> = {
  riksdag: 2,
  region: 1,
  kommun: 0,
  eu: 0,
};

const ELECTION_TITLES: Record<ElectionType, string> = {
  riksdag: "VAL TILL RIKSDAGEN",
  region: "VAL TILL REGIONFULLMÄKTIGE",
  kommun: "VAL TILL KOMMUNFULLMÄKTIGE",
  eu: "VAL TILL EUROPAPARLAMENTET",
};

const CHOICE_LABELS = ["FÖRSTAHANDSVAL", "ANDRAHANDSVAL", "TREDJEHANDSVAL"];

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function generateSignalLinesEsoPic(count: number): string {
  if (count === 0) return "";

  const pageHeight = 148;
  const pageWidth = 105;
  const centerY = pageHeight / 2;
  const lineLength = 8;
  const lineWidth = 1.5;
  const lineSpacing = lineWidth;

  const lines = [];

  for (let i = 0; i < count; i++) {
    const totalHeight = count * lineWidth + (count - 1) * lineSpacing;
    const yPos = centerY + totalHeight / 2 - i * (lineWidth + lineSpacing) - lineWidth;

    lines.push(`      \\put(0mm,${yPos}mm){\\rule{${lineLength}mm}{${lineWidth}mm}}`);
    lines.push(`      \\put(${pageWidth - lineLength}mm,${yPos}mm){\\rule{${lineLength}mm}{${lineWidth}mm}}`);
  }

  return `
\\AddToShipoutPictureBG*{%
  \\AtPageLowerLeft{%
${lines.join("\n")}
  }%
}`;
}

function generateCandidateRow(kandidat: Candidate): string {
  const fontSize = 8;
  const boxSize = 3.5;
  const info = kandidat.info ? `, ${escapeLatex(kandidat.info)}` : "";

  const yPos = 0.6; // mm, adjusted for baseline anchor
  return `{\\fontsize{${fontSize}}{${fontSize + 2}}\\selectfont\\noindent\\begin{tikzpicture}[baseline=0.5ex]
  \\draw[thick] (0,0) rectangle (${boxSize}mm,${boxSize}mm);
  \\draw[thick] (${boxSize * 0.2}mm,${boxSize * 0.5}mm) -- (${boxSize * 0.43}mm,${boxSize * 0.2}mm) -- (${boxSize * 0.86}mm,${boxSize * 0.86}mm);
  \\node[anchor=base west] at (${boxSize + 1.5}mm, ${yPos}mm) {\\strut ${kandidat.nummer}\\hspace{4mm}${escapeLatex(kandidat.fornamn)} ${escapeLatex(kandidat.efternamn)}${info}};
\\end{tikzpicture}}`;
}

function generatePartySection(choice: PartyChoice): string {
  const logoHeight = 12.75;
  const fontSize = 28;

  const partyContent = choice.partisymbol
    ? `\\includegraphics[width=\\textwidth,height=${logoHeight}mm,keepaspectratio]{${choice.partisymbol}}`
    : `\\adjustbox{max width=\\textwidth}{\\fontsize{${fontSize}}{${fontSize + 4}}\\selectfont\\bfseries ${escapeLatex(choice.partibeteckning)}}`;

  const kandidatRow = choice.kandidat
    ? `\\vspace{2mm}\n${generateCandidateRow(choice.kandidat)}`
    : "";

  return `{\\centering${partyContent}\\par}
${kandidatRow}`;
}

export function generateLatex(data: BallotData): string {
  const color = BALLOT_COLORS[data.electionType];
  const signalLineCount = SIGNAL_LINES[data.electionType];
  const electionTitle = ELECTION_TITLES[data.electionType];
  const numParties = data.partier.length;

  const footerCodes = [data.listtypKod, data.valkretskod].filter(Boolean).join("\\hspace{5mm}");

  // Dashed line command
  const dashedLine = "\\noindent\\tikz\\draw[dashed, line width=0.4pt] (0,0) -- (\\textwidth,0);";

  let partyContent: string;

  // Page: 148mm, margins: 8mm, header: 10mm, footer: 18mm, lines: 3mm = ~109mm available
  const totalContentHeight = 109;
  const sectionHeight = Math.floor(totalContentHeight / numParties);

  const sections = data.partier.map((party, index) => {
    const content = generatePartySection(party);

    if (numParties === 1) {
      // Single party - top aligned like multi-party
      return `\\begin{minipage}[t][${sectionHeight}mm][t]{\\textwidth}
\\vspace{4mm}

${content}
\\end{minipage}`;
    } else {
      // Multiple parties - top aligned with header
      const header = `\\noindent{\\fontsize{7}{9}\\selectfont\\bfseries ${CHOICE_LABELS[index]}}`;
      return `\\begin{minipage}[t][${sectionHeight}mm][t]{\\textwidth}
${header}

\\vspace{4mm}

${content}
\\end{minipage}`;
    }
  });

  // Join with dashed horizontal rules (top line only, bottom is absolute positioned)
  if (numParties === 1) {
    partyContent = `${dashedLine}

${sections[0]}`;
  } else {
    partyContent = `${dashedLine}

${sections.join(`

${dashedLine}

`)}`;
  }

  return `% Valsedel genererad av valsedel.partidata.se
% Valtyp: ${data.electionType}
% Antal partier: ${numParties}

\\documentclass{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[swedish]{babel}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{graphicx}
\\usepackage{adjustbox}
\\usepackage{fontspec}
\\usepackage{tikz}
\\usepackage{eso-pic}

\\definecolor{bakgrund}{RGB}{${color.rgb}}

\\geometry{
  paperwidth=105mm,
  paperheight=148mm,
  left=10mm,
  right=10mm,
  top=4mm,
  bottom=4mm,
  nohead,
  nofoot
}

\\pagecolor{bakgrund}

\\setmainfont{OpenSans}[
  Path = /usr/share/fonts/truetype/open-sans/,
  Extension = .ttf,
  UprightFont = *-Regular,
  BoldFont = *-Bold,
  ItalicFont = *-Italic,
  BoldItalicFont = *-BoldItalic,
]

\\begin{document}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

% --- VALBETECKNING ---
\\begin{center}
{\\fontsize{9}{11}\\selectfont\\bfseries ${escapeLatex(electionTitle)}}
\\end{center}

\\vspace{-2mm}

% --- PARTIVAL ---
${partyContent}

% --- SIGNALLINJER ---
${generateSignalLinesEsoPic(signalLineCount)}

% --- SIDFOT (absolut positionerad) ---
\\AddToShipoutPictureFG*{%
  \\AtPageLowerLeft{%
    \\put(10mm,16mm){\\tikz\\draw[dashed, line width=0.4pt] (0,0) -- (85mm,0);}%
    \\put(10mm,4mm){%
      \\begin{minipage}[b][13mm][b]{85mm}%
        \\begin{center}
        {\\fontsize{8}{10}\\selectfont\\bfseries ${escapeLatex(data.valkrets)}}

        \\vspace{2mm}

        {\\fontsize{11}{13}\\selectfont ${footerCodes}}
        \\end{center}
      \\end{minipage}%
    }%
  }%
}

\\end{document}
`;
}

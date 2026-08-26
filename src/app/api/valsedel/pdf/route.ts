import { NextRequest, NextResponse } from "next/server";
import { generateLatex, type BallotData, type PartyChoice } from "@/lib/latex-generator";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const execAsync = promisify(exec);

const TEMP_DIR = "/tmp/valsedel-latex";
const OUTPUT_DIR = process.env.LATEX_OUTPUT_DIR || process.cwd() + "/output";

async function isDockerLatexAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("docker ps --filter name=valsedel-latex-1 --format '{{.Names}}'");
    return stdout.trim().includes("valsedel-latex-1");
  } catch {
    return false;
  }
}

interface PDFRequest {
  electionType: "riksdag" | "region" | "kommun" | "eu";
  valkrets: string;
  partier: Array<{
    partibeteckning: string;
    partisymbol?: string;
    kandidat?: {
      nummer: number;
      fornamn: string;
      efternamn: string;
      info?: string;
    };
  }>;
  listtypKod?: string;
  valkretskod?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json();

    // Validate required fields
    if (!body.electionType || !body.valkrets || !body.partier || body.partier.length === 0) {
      return NextResponse.json(
        { error: "Saknade fält: electionType, valkrets och minst ett parti krävs" },
        { status: 400 }
      );
    }

    if (body.partier.length > 3) {
      return NextResponse.json(
        { error: "Max 3 partier tillåtna" },
        { status: 400 }
      );
    }

    // Validate election type
    if (!["riksdag", "region", "kommun", "eu"].includes(body.electionType)) {
      return NextResponse.json(
        { error: "Ogiltig valtyp" },
        { status: 400 }
      );
    }

    const useDocker = await isDockerLatexAvailable();

    const partier: PartyChoice[] = body.partier.map((p) => ({
      partibeteckning: p.partibeteckning,
      partisymbol: p.partisymbol,
      kandidat: p.kandidat,
    }));

    const ballotData: BallotData = {
      electionType: body.electionType,
      valkrets: body.valkrets,
      partier,
      listtypKod: body.listtypKod,
      valkretskod: body.valkretskod,
    };

    const requestId = crypto.randomBytes(8).toString("hex");

    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const latexContent = generateLatex(ballotData);

    const texPath = path.join(TEMP_DIR, `valsedel-${requestId}.tex`);
    await fs.writeFile(texPath, latexContent, "utf-8");

    const pdfPath = path.join(OUTPUT_DIR, `valsedel-${requestId}.pdf`);
    const texFileName = `valsedel-${requestId}.tex`;
    const pdfFileName = `valsedel-${requestId}.pdf`;

    try {
      if (useDocker) {
        await execAsync(`docker cp "${texPath}" valsedel-latex-1:/latex/${texFileName}`);
        await execAsync(
          `docker exec valsedel-latex-1 xelatex -output-directory=/latex/output -interaction=nonstopmode /latex/${texFileName}`,
          { timeout: 30000 }
        );
        await execAsync(`docker cp valsedel-latex-1:/latex/output/${pdfFileName} "${pdfPath}"`);
      } else {
        await execAsync(
          `xelatex -output-directory="${OUTPUT_DIR}" -interaction=nonstopmode "${texPath}"`,
          { timeout: 30000 }
        );
      }
    } catch (error: unknown) {
      const err = error as { stderr?: string; stdout?: string };
      console.error("LaTeX compilation warning/error:", err.stderr || err.stdout);
    }

    try {
      await fs.access(pdfPath);
    } catch {
      return NextResponse.json(
        { error: "PDF-generering misslyckades", details: "Kunde inte skapa PDF. Kontrollera att LaTeX-container är igång." },
        { status: 500 }
      );
    }

    const pdfBuffer = await fs.readFile(pdfPath);
    await fs.unlink(texPath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});

    const sanitize = (s: string) => s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
      .replace(/[^a-zA-Z0-9]/g, "_");

    const filename = body.partier.length === 1
      ? `valsedel-${body.electionType}-${sanitize(body.partier[0].partibeteckning)}.pdf`
      : `valsedel-${body.electionType}-ranked-choice.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Internt serverfel vid PDF-generering" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "POST till denna endpoint med valsedelsdata för att generera PDF",
    example: {
      electionType: "riksdag",
      valkrets: "Norrbottens län",
      partier: [
        {
          partibeteckning: "Socialdemokraterna",
          kandidat: {
            nummer: 1,
            fornamn: "Magdalena",
            efternamn: "Andersson",
          },
        },
        {
          partibeteckning: "Centerpartiet",
        },
      ],
      listtypKod: "3456",
      valkretskod: "11901",
    },
  });
}

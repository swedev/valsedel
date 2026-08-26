/**
 * Test script for LaTeX generation
 * Run with: npx tsx latex/test-generate.ts
 */

import { generateLatex, type BallotData } from "../src/lib/latex-generator";
import * as fs from "fs";
import * as path from "path";

const testData: BallotData = {
  electionType: "riksdag",
  valkrets: "Stockholms kommun",
  partier: [
    {
      partibeteckning: "Socialdemokraterna",
      kandidat: {
        nummer: 1,
        fornamn: "Magdalena",
        efternamn: "Andersson",
        info: "56 år, statsminister",
      },
    },
  ],
};

const latex = generateLatex(testData);

// Write to file
const outputPath = path.join(__dirname, "output", "test-riksdag.tex");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, latex);

console.log("Generated LaTeX file:", outputPath);
console.log("\nTo compile (requires xelatex with Open Sans):");
console.log(`  cd latex/output && xelatex test-riksdag.tex`);
console.log("\nOr with Docker:");
console.log(`  docker-compose run latex test-riksdag.tex`);
console.log("\n--- LaTeX Preview (first 80 lines) ---\n");
console.log(latex.split("\n").slice(0, 80).join("\n"));

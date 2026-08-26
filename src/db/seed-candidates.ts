import "dotenv/config";
import { db } from "./index";
import { candidates, parties, regions } from "./schema";

const KANDIDATURER_URL = "https://data.val.se/filer/val2026/parti/kandidaturer.csv";
const PARTIER_URL = "https://data.val.se/filer/val2026/parti/deltagande-partier.csv";

interface KandidatRow {
  VALTYP: string;
  VALKRETSKOD: string;
  VALKRETSNAMN: string;
  PARTIKOD: string;
  PARTIBETECKNING: string;
  ORDNING: string;
  KANDIDATNUMMER: string;
  NAMN: string;
  ÅLDER_PÅ_VALDAGEN: string;
  KÖN: string;
  FOLKBOKFÖRINGSKOMMUN: string;
  SAMTYCKE: string;
}

interface PartiRow {
  PARTIKOD: string;
  PARTIBETECKNING: string;
  PARTIFÖRKORTNING: string;
}

const VALTYP_MAP: Record<string, "riksdag" | "region" | "kommun" | "eu"> = {
  RD: "riksdag",
  RF: "region",
  KF: "kommun",
  EP: "eu",
};

function parseCsv<T>(text: string): T[] {
  // Convert CR to LF and split
  const lines = text.replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length === 0) return [];

  // Remove BOM if present
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headers = headerLine.split(";");

  return lines.slice(1).map((line) => {
    const values = line.split(";");
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });
    return row as T;
  });
}

async function seedCandidates() {
  // Step 1: Fetch and upsert parties from Valmyndigheten
  console.log("=== Step 1: Importing parties from Valmyndigheten ===\n");
  console.log(`URL: ${PARTIER_URL}`);

  const partierResponse = await fetch(PARTIER_URL);
  if (!partierResponse.ok) {
    throw new Error(`Failed to fetch parties: ${partierResponse.status}`);
  }

  const partierText = await partierResponse.text();
  const partierRows = parseCsv<PartiRow>(partierText);
  console.log(`Parsed ${partierRows.length} party rows from CSV`);

  // Get unique parties by kod
  const uniqueParties = new Map<string, PartiRow>();
  for (const row of partierRows) {
    if (row.PARTIKOD && !uniqueParties.has(row.PARTIKOD)) {
      uniqueParties.set(row.PARTIKOD, row);
    }
  }
  console.log(`Found ${uniqueParties.size} unique parties\n`);

  // Check which parties already exist
  const existingParties = await db.select().from(parties);
  const existingKods = new Set(existingParties.map((p) => p.kod));

  const newParties = Array.from(uniqueParties.values()).filter(
    (p) => !existingKods.has(p.PARTIKOD)
  );

  if (newParties.length > 0) {
    console.log(`Inserting ${newParties.length} new parties...`);
    await db.insert(parties).values(
      newParties.map((p) => ({
        kod: p.PARTIKOD,
        beteckning: p.PARTIBETECKNING,
        forkortning: p.PARTIFÖRKORTNING || null,
        logoUrl: null,
      }))
    );
    console.log("Parties inserted.\n");
  } else {
    console.log("No new parties to insert.\n");
  }

  // Step 2: Fetch candidates
  console.log("=== Step 2: Importing candidates ===\n");
  console.log(`URL: ${KANDIDATURER_URL}`);

  const response = await fetch(KANDIDATURER_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const rows = parseCsv<KandidatRow>(text);
  console.log(`Parsed ${rows.length} candidate rows from CSV\n`);

  // Step 2a: Create missing valkretsar from candidate data
  console.log("Checking for missing valkretsar...");
  const existingRegions = await db.select().from(regions);
  const existingRegionKods = new Set(existingRegions.map((r) => r.kod));

  const uniqueValkretsar = new Map<string, { kod: string; namn: string }>();
  for (const row of rows) {
    if (row.VALKRETSKOD && row.VALKRETSNAMN && !uniqueValkretsar.has(row.VALKRETSKOD)) {
      uniqueValkretsar.set(row.VALKRETSKOD, {
        kod: row.VALKRETSKOD,
        namn: row.VALKRETSNAMN,
      });
    }
  }

  const newValkretsar = Array.from(uniqueValkretsar.values()).filter(
    (v) => !existingRegionKods.has(v.kod)
  );

  if (newValkretsar.length > 0) {
    console.log(`Inserting ${newValkretsar.length} new valkretsar...`);
    await db.insert(regions).values(
      newValkretsar.map((v) => ({
        kod: v.kod,
        namn: v.namn,
        typ: "valkrets" as const,
        parentId: null,
      }))
    );
    console.log("Valkretsar inserted.\n");
  } else {
    console.log("No new valkretsar to insert.\n");
  }

  // Get all parties and regions from database for lookup
  console.log("Loading parties and regions from database...");
  const allParties = await db.select().from(parties);
  const allRegions = await db.select().from(regions);

  const partyByKod = new Map(allParties.map((p) => [p.kod, p]));
  const regionByKod = new Map(allRegions.map((r) => [r.kod, r]));

  console.log(`Found ${allParties.length} parties and ${allRegions.length} regions in database\n`);

  // Clear existing candidates
  console.log("Clearing existing candidates...");
  await db.delete(candidates);

  // Process candidates
  const candidatesToInsert: Array<{
    namn: string;
    alder: number | null;
    hemvist: string | null;
    yrke: string | null;
    listNr: number;
    partyId: string;
    regionId: string;
    valtyp: "riksdag" | "region" | "kommun" | "eu";
    valAr: number;
  }> = [];

  const skipped = {
    noParty: 0,
    noRegion: 0,
    noConsent: 0,
    noName: 0,
  };

  for (const row of rows) {
    // Skip if no consent
    if (row.SAMTYCKE !== "J") {
      skipped.noConsent++;
      continue;
    }

    // Skip if no name
    if (!row.NAMN || row.NAMN.trim() === "") {
      skipped.noName++;
      continue;
    }

    // Find party
    const party = partyByKod.get(row.PARTIKOD);
    if (!party) {
      skipped.noParty++;
      continue;
    }

    // Find region (use valkretskod, fallback to "00" for riksdag)
    let region = regionByKod.get(row.VALKRETSKOD);
    if (!region) {
      // Try to find by matching kommun name
      region = allRegions.find(
        (r) => r.namn.toLowerCase() === row.VALKRETSNAMN?.toLowerCase()
      );
    }
    if (!region) {
      // For riksdag, use a default region or skip
      if (row.VALTYP === "RD") {
        // Use first län as fallback for riksdag
        region = allRegions.find((r) => r.typ === "lan");
      }
    }
    if (!region) {
      skipped.noRegion++;
      continue;
    }

    const valtyp = VALTYP_MAP[row.VALTYP];
    if (!valtyp) {
      continue;
    }

    const listNr = row.ORDNING ? parseInt(row.ORDNING, 10) : 1;

    candidatesToInsert.push({
      namn: row.NAMN,
      alder: row.ÅLDER_PÅ_VALDAGEN ? parseInt(row.ÅLDER_PÅ_VALDAGEN, 10) : null,
      hemvist: row.FOLKBOKFÖRINGSKOMMUN || null,
      yrke: null, // Not in Valmyndigheten data
      listNr: isNaN(listNr) ? 1 : listNr,
      partyId: party.id,
      regionId: region.id,
      valtyp,
      valAr: 2026,
    });
  }

  console.log(`Skipped rows:`);
  console.log(`  - No consent: ${skipped.noConsent}`);
  console.log(`  - No party match: ${skipped.noParty}`);
  console.log(`  - No region match: ${skipped.noRegion}`);
  console.log(`  - No name: ${skipped.noName}`);
  console.log(`\nInserting ${candidatesToInsert.length} candidates...`);

  // Insert in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < candidatesToInsert.length; i += BATCH_SIZE) {
    const batch = candidatesToInsert.slice(i, i + BATCH_SIZE);
    await db.insert(candidates).values(batch);
    console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidatesToInsert.length / BATCH_SIZE)}`);
  }

  console.log("\nCandidate seeding complete!");

  // Show some stats
  const finalCount = await db.select().from(candidates);
  console.log(`Total candidates in database: ${finalCount.length}`);

  process.exit(0);
}

seedCandidates().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

import "dotenv/config";
import { db } from "./index";
import { parties, regions, type NewParty, type NewRegion } from "./schema";
import * as fs from "fs";
import * as path from "path";

const PARTIDATA_PATH = path.resolve(__dirname, "../../../partidata");

interface PartiIndexItem {
  uuid: string;
  beteckning: string;
  filnamn: string;
}

interface PartiFullData {
  beteckning: string;
  filnamn: string;
  forkortning?: string;
  kod: string;
  uuid: string;
  valmyndigheten_registreringsdatum?: string;
}

interface KommunData {
  kod: string;
  namn: string;
  uuid: string;
}

interface LanData {
  kod: string;
  namn: string;
  uuid: string;
  kommuner: KommunData[];
}

async function loadParties(): Promise<NewParty[]> {
  const indexPath = path.join(PARTIDATA_PATH, "data/parti/index.json");
  const indexData: PartiIndexItem[] = JSON.parse(
    fs.readFileSync(indexPath, "utf-8")
  );

  const partiesData: NewParty[] = [];

  for (const item of indexData) {
    // Try to load detailed data from individual file
    const detailPath = path.join(
      PARTIDATA_PATH,
      "data/parti",
      item.filnamn,
      "index.json"
    );

    let kod = "";
    let forkortning: string | null = null;
    let registreringsdatum: Date | null = null;

    if (fs.existsSync(detailPath)) {
      try {
        const detailData: PartiFullData = JSON.parse(
          fs.readFileSync(detailPath, "utf-8")
        );
        kod = detailData.kod || "";
        forkortning = detailData.forkortning || null;
        if (detailData.valmyndigheten_registreringsdatum) {
          registreringsdatum = new Date(
            detailData.valmyndigheten_registreringsdatum
          );
        }
      } catch {
        // If detail file can't be parsed, continue with minimal data
      }
    }

    partiesData.push({
      id: item.uuid,
      kod: kod || item.filnamn, // fallback to filnamn if no kod
      beteckning: item.beteckning,
      forkortning,
      registreringsdatum,
      // Symbols will be supplied by the per-constituency partidata bundle.
      // Until that exists, the UI and PDF renderer fall back to the party name.
      logoUrl: null,
    });
  }

  return partiesData;
}

async function loadRegions(): Promise<NewRegion[]> {
  const regionsPath = path.join(PARTIDATA_PATH, "data/regioner/index.json");
  const regionsData: LanData[] = JSON.parse(
    fs.readFileSync(regionsPath, "utf-8")
  );

  const allRegions: NewRegion[] = [];

  // First add all län
  for (const lan of regionsData) {
    allRegions.push({
      id: lan.uuid,
      kod: lan.kod,
      namn: lan.namn,
      typ: "lan",
      parentId: null,
    });
  }

  // Then add all kommuner with references to their län
  for (const lan of regionsData) {
    for (const kommun of lan.kommuner) {
      allRegions.push({
        id: kommun.uuid,
        kod: kommun.kod,
        namn: kommun.namn,
        typ: "kommun",
        parentId: lan.uuid,
      });
    }
  }

  return allRegions;
}

async function seed() {
  console.log("Seeding database...");
  console.log(`Reading data from: ${PARTIDATA_PATH}`);

  // Check if partidata exists
  if (!fs.existsSync(PARTIDATA_PATH)) {
    console.error(`Error: partidata directory not found at ${PARTIDATA_PATH}`);
    console.error("Make sure the partidata repo is cloned at ../partidata");
    process.exit(1);
  }

  // Load data
  console.log("\nLoading parties...");
  const partiesData = await loadParties();
  console.log(`Found ${partiesData.length} parties`);

  console.log("\nLoading regions...");
  const regionsData = await loadRegions();
  const lanCount = regionsData.filter((r) => r.typ === "lan").length;
  const kommunCount = regionsData.filter((r) => r.typ === "kommun").length;
  console.log(`Found ${lanCount} län and ${kommunCount} kommuner`);

  // Clear existing data
  console.log("\nClearing existing data...");
  await db.delete(regions);
  await db.delete(parties);

  // Insert parties
  console.log("\nInserting parties...");
  await db.insert(parties).values(partiesData);
  console.log(`Inserted ${partiesData.length} parties`);

  // Insert regions (län first, then kommuner to satisfy foreign key)
  console.log("\nInserting regions...");
  const lanData = regionsData.filter((r) => r.typ === "lan");
  const kommunData = regionsData.filter((r) => r.typ === "kommun");

  await db.insert(regions).values(lanData);
  console.log(`Inserted ${lanData.length} län`);

  await db.insert(regions).values(kommunData);
  console.log(`Inserted ${kommunData.length} kommuner`);

  console.log("\nSeeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

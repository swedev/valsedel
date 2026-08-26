import { db } from "@/db";
import { candidates, parties, regions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ partikod: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { partikod } = await params;
  const searchParams = request.nextUrl.searchParams;
  const valtyp = searchParams.get("valtyp") as
    | "riksdag"
    | "region"
    | "kommun"
    | "eu"
    | null;
  const regionKod = searchParams.get("regionKod");

  // Find the party by kod
  const party = await db
    .select()
    .from(parties)
    .where(eq(parties.kod, partikod))
    .limit(1);

  if (party.length === 0) {
    return NextResponse.json(
      { error: "Parti hittades inte" },
      { status: 404 }
    );
  }

  // Build query for candidates
  const conditions = [eq(candidates.partyId, party[0].id)];

  if (valtyp) {
    conditions.push(eq(candidates.valtyp, valtyp));
  }

  if (regionKod) {
    // Find region by kod
    const region = await db
      .select()
      .from(regions)
      .where(eq(regions.kod, regionKod))
      .limit(1);

    if (region.length > 0) {
      conditions.push(eq(candidates.regionId, region[0].id));
    }
  }

  const candidateList = await db
    .select()
    .from(candidates)
    .where(and(...conditions))
    .orderBy(candidates.listNr);

  return NextResponse.json({
    party: party[0],
    candidates: candidateList,
    count: candidateList.length,
  });
}

import { db } from "@/db";
import { regions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const typ = searchParams.get("typ"); // "lan" or "kommun"
  const lanKod = searchParams.get("lanKod"); // Filter kommuner by län

  // If typ is specified, filter by it
  if (typ === "lan") {
    const results = await db
      .select()
      .from(regions)
      .where(eq(regions.typ, "lan"))
      .orderBy(regions.namn);

    return NextResponse.json({
      regions: results,
      count: results.length,
    });
  }

  if (typ === "kommun") {
    // If lanKod is specified, filter kommuner by their parent län
    if (lanKod) {
      // First find the län by kod
      const lan = await db
        .select()
        .from(regions)
        .where(eq(regions.kod, lanKod))
        .limit(1);

      if (lan.length > 0) {
        const results = await db
          .select()
          .from(regions)
          .where(and(eq(regions.typ, "kommun"), eq(regions.parentId, lan[0].id)))
          .orderBy(regions.namn);

        return NextResponse.json({
          regions: results,
          count: results.length,
        });
      }
    }

    // No lanKod filter, return all kommuner
    const results = await db
      .select()
      .from(regions)
      .where(eq(regions.typ, "kommun"))
      .orderBy(regions.namn);

    return NextResponse.json({
      regions: results,
      count: results.length,
    });
  }

  // Default: return all regions grouped by type
  const lan = await db
    .select()
    .from(regions)
    .where(eq(regions.typ, "lan"))
    .orderBy(regions.namn);

  const kommuner = await db
    .select()
    .from(regions)
    .where(eq(regions.typ, "kommun"))
    .orderBy(regions.namn);

  return NextResponse.json({
    lan,
    kommuner,
    counts: {
      lan: lan.length,
      kommuner: kommuner.length,
    },
  });
}

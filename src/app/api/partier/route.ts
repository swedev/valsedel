import { db } from "@/db";
import { parties, candidates } from "@/db/schema";
import { ilike, or, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  if (!search || search.length === 0) {
    return NextResponse.json({
      parties: [],
      count: 0,
    });
  }

  // Search parties
  const partyResults = await db
    .select()
    .from(parties)
    .where(
      or(
        ilike(parties.beteckning, `%${search}%`),
        ilike(parties.forkortning, `%${search}%`),
        ilike(parties.kod, `%${search}%`)
      )
    )
    .orderBy(parties.beteckning)
    .limit(limit);

  // Search candidates by name
  const candidateResults = await db
    .select({
      candidate: candidates,
      party: parties,
    })
    .from(candidates)
    .innerJoin(parties, eq(candidates.partyId, parties.id))
    .where(ilike(candidates.namn, `%${search}%`))
    .orderBy(candidates.namn)
    .limit(limit);

  // Format results - parties first, then candidates with their party info
  const formattedParties = partyResults.map((p) => ({
    id: p.id,
    kod: p.kod,
    beteckning: p.beteckning,
    forkortning: p.forkortning,
    logoUrl: p.logoUrl,
    type: "party" as const,
  }));

  const formattedCandidates = candidateResults.map((r) => ({
    id: `${r.party.id}-${r.candidate.id}`,
    kod: r.party.kod,
    beteckning: r.party.beteckning,
    forkortning: r.party.forkortning,
    logoUrl: r.party.logoUrl,
    type: "candidate" as const,
    kandidat: {
      id: r.candidate.id,
      nummer: r.candidate.listNr,
      namn: r.candidate.namn,
      info: [r.candidate.yrke, r.candidate.hemvist].filter(Boolean).join(", ") || undefined,
    },
  }));

  return NextResponse.json({
    parties: [...formattedParties, ...formattedCandidates].slice(0, limit),
    count: formattedParties.length + formattedCandidates.length,
  });
}

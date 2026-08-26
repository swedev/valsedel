"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, FileDown, LoaderCircle, X } from "lucide-react";
import type { ElectionType } from "./ElectionTypeSelector";
import type { Party } from "./PartySearch";

function BallotPartyLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return <div className="font-bold text-lg">{name}</div>;
  }

  return (
    // Partidata symbols will be local object URLs from the constituency bundle.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      className="max-w-[170px] max-h-[25px] object-contain"
      onError={() => setFailed(true)}
    />
  );
}

interface BallotPreviewProps {
  electionType: ElectionType;
  parties: Party[];
  valkrets?: string;
  onRemoveParty: (partyId: string) => void;
  onReorderParty: (fromIndex: number, toIndex: number) => void;
}

const ballotColors: Record<ElectionType, { bg: string; border: string; title: string }> = {
  riksdag: {
    bg: "#FFFFC8",
    border: "#D4D396",
    title: "VAL TILL RIKSDAGEN",
  },
  region: {
    bg: "#C8E1F5",
    border: "#9BC5E8",
    title: "VAL TILL REGIONFULLMÄKTIGE",
  },
  kommun: {
    bg: "#FFFFFF",
    border: "#E5E7EB",
    title: "VAL TILL KOMMUNFULLMÄKTIGE",
  },
  eu: {
    bg: "#FFFFFF",
    border: "#1D4ED8",
    title: "VAL TILL EUROPAPARLAMENTET",
  },
};

const signalLineCount: Record<ElectionType, number> = {
  riksdag: 2,
  region: 1,
  kommun: 0,
  eu: 0,
};

const choiceLabels = ["FÖRSTAHANDSVAL", "ANDRAHANDSVAL", "TREDJEHANDSVAL"];

export function BallotPreview({
  electionType,
  parties,
  valkrets = "Sverige",
  onRemoveParty,
  onReorderParty,
}: BallotPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const colors = ballotColors[electionType];
  const signalLines = signalLineCount[electionType];

  const handleDownloadPDF = async () => {
    if (parties.length === 0) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch("/api/valsedel/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionType,
          valkrets,
          partier: parties.map((p) => ({
            partibeteckning: p.beteckning,
            partisymbol: p.logoUrl,
            kandidat: p.kandidat ? {
              nummer: p.kandidat.nummer,
              fornamn: p.kandidat.namn.split(" ")[0],
              efternamn: p.kandidat.namn.split(" ").slice(1).join(" "),
              info: p.kandidat.info,
            } : undefined,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Kunde inte generera PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = parties.length === 1
        ? `valsedel-${electionType}-${parties[0].beteckning.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, "_")}.pdf`
        : `valsedel-${electionType}-ranked-choice.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      setDownloadError(error instanceof Error ? error.message : "Något gick fel");
    } finally {
      setIsDownloading(false);
    }
  };

  if (parties.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Din valsedel</h2>
        <div
          className="card border-2 border-dashed p-8 text-center"
          style={{ borderColor: colors.border, backgroundColor: colors.bg }}
        >
          <p className="text-gray-500">Välj ett parti för att se din valsedel</p>
        </div>
      </div>
    );
  }

  const isMultiple = parties.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Din valsedel</h2>

      {/* Ballot card */}
      <div
        className="card border-2 overflow-hidden shadow-sm"
        style={{ borderColor: colors.border }}
      >
        <div className="p-4 relative" style={{ backgroundColor: colors.bg, color: "#171717" }}>
          {/* Signal lines */}
          {signalLines > 0 && (
            <>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-[1.5mm]">
                {Array.from({ length: signalLines }).map((_, i) => (
                  <div key={`l${i}`} className="w-3 h-[1.5mm] bg-black" />
                ))}
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-[1.5mm]">
                {Array.from({ length: signalLines }).map((_, i) => (
                  <div key={`r${i}`} className="w-3 h-[1.5mm] bg-black" />
                ))}
              </div>
            </>
          )}

          {/* Election title */}
          <div className="text-center text-[10px] font-bold tracking-wide mb-2">
            {colors.title}
          </div>

          {/* Top dashed line */}
          <div className="border-t border-dashed border-gray-400 mb-3" />

          {/* Party choices */}
          <div className="px-2">
            {parties.map((party, index) => (
              <div key={party.id} className="group">
                {/* Dashed line between sections */}
                {isMultiple && index > 0 && (
                  <div className="border-t border-dashed border-gray-400 my-3" />
                )}

                {/* Choice header */}
                {isMultiple && (
                  <div className="text-[7px] font-bold mb-2">{choiceLabels[index]}</div>
                )}

                {/* Party content */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <BallotPartyLogo logoUrl={party.logoUrl} name={party.beteckning} />

                    {/* Kandidat row */}
                    {party.kandidat && (
                      <div className="flex items-center gap-2 mt-2 text-[8px]">
                        <div className="w-3 h-3 border border-current flex items-center justify-center shrink-0">
                          <Check size={8} strokeWidth={3} />
                        </div>
                        <span>
                          {party.kandidat.nummer}
                          <span className="mx-2">{party.kandidat.namn}</span>
                          {party.kandidat.info && (
                            <span className="opacity-60">{party.kandidat.info}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onReorderParty(index, index - 1)}
                        title="Flytta upp"
                      >
                        <ChevronUp size={16} />
                      </button>
                    )}
                    {index < parties.length - 1 && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onReorderParty(index, index + 1)}
                        title="Flytta ner"
                      >
                        <ChevronDown size={16} />
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => onRemoveParty(party.id)}
                      title="Ta bort"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom dashed line */}
          <div className="border-t border-dashed border-gray-400 mt-3 mb-2" />

          {/* Valkrets */}
          <div className="text-center text-[9px] font-bold">{valkrets}</div>
        </div>
      </div>

      {/* Info text */}
      {parties.length < 3 && (
        <p className="text-xs text-gray-500 text-center">
          Du kan lägga till {3 - parties.length} parti{parties.length === 2 ? "" : "er"} till för ranked choice
        </p>
      )}

      {isMultiple && (
        <div className="alert alert-info text-xs">
          Ranked choice: Om val 1 inte får tillräckligt med röster räknas din röst för val 2, osv.
        </div>
      )}

      {/* Download button */}
      <button
        className="btn btn-primary w-full"
        onClick={handleDownloadPDF}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            Genererar PDF...
          </>
        ) : (
          <>
            <FileDown size={18} />
            Ladda ner PDF
          </>
        )}
      </button>

      {downloadError && (
        <div className="alert alert-error text-sm">{downloadError}</div>
      )}

      <p className="text-xs text-gray-500 text-center">
        PDF:en genereras i officiellt A6-format (105 × 148 mm)
      </p>
    </div>
  );
}

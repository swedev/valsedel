"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  ElectionTypeSelector,
  RegionSelector,
  PartySearch,
  BallotPreview,
  type ElectionType,
  type Party,
} from "@/components";

interface Region {
  id: string;
  kod: string;
  namn: string;
  typ: "lan" | "kommun";
  parentId: string | null;
}

export default function Home() {
  const [electionType, setElectionType] = useState<ElectionType | null>(null);
  const [selectedLan, setSelectedLan] = useState<Region | null>(null);
  const [selectedKommun, setSelectedKommun] = useState<Region | null>(null);
  const [selectedParties, setSelectedParties] = useState<Party[]>([]);

  const handleSelectParty = (party: Party) => {
    if (selectedParties.length < 3) {
      setSelectedParties([...selectedParties, party]);
    }
  };

  const handleRemoveParty = (partyId: string) => {
    setSelectedParties(selectedParties.filter((p) => p.id !== partyId));
  };

  const handleReorderParty = (fromIndex: number, toIndex: number) => {
    const newParties = [...selectedParties];
    const [removed] = newParties.splice(fromIndex, 1);
    newParties.splice(toIndex, 0, removed);
    setSelectedParties(newParties);
  };

  // Check if region selection is needed and complete
  const needsRegion = electionType === "region" || electionType === "kommun";
  const regionComplete =
    !needsRegion ||
    (electionType === "region" && selectedLan) ||
    (electionType === "kommun" && selectedLan && selectedKommun);

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">valsedel.partidata.se</h1>
          <p className="opacity-60 mt-1">
            Skapa din egen valsedel med ranked choice voting
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column - Selection */}
          <div className="space-y-8">
            {/* Step 1: Election type */}
            <section className="card bg-base-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="badge badge-primary badge-lg">1</span>
                <span className="text-sm opacity-60">Steg 1</span>
              </div>
              <ElectionTypeSelector
                value={electionType}
                onChange={(type) => {
                  setElectionType(type);
                  setSelectedLan(null);
                  setSelectedKommun(null);
                }}
              />
            </section>

            {/* Step 2: Region (if needed) */}
            {electionType && needsRegion && (
              <section className="card bg-base-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge badge-primary badge-lg">2</span>
                  <span className="text-sm opacity-60">Steg 2</span>
                </div>
                <RegionSelector
                  electionType={electionType}
                  selectedLan={selectedLan}
                  selectedKommun={selectedKommun}
                  onLanChange={setSelectedLan}
                  onKommunChange={setSelectedKommun}
                />
              </section>
            )}

            {/* Step 3: Party selection */}
            {electionType && regionComplete && (
              <section className="card bg-base-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge badge-primary badge-lg">
                    {needsRegion ? "3" : "2"}
                  </span>
                  <span className="text-sm opacity-60">
                    Steg {needsRegion ? "3" : "2"}
                  </span>
                </div>
                <PartySearch
                  onSelect={handleSelectParty}
                  selectedParties={selectedParties}
                  maxSelections={3}
                />
              </section>
            )}
          </div>

          {/* Right column - Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <section className="card bg-base-100 shadow-sm p-6">
              {electionType ? (
                <BallotPreview
                  electionType={electionType}
                  parties={selectedParties}
                  valkrets={
                    electionType === "kommun" && selectedKommun
                      ? selectedKommun.namn
                      : electionType === "region" && selectedLan
                        ? selectedLan.namn
                        : electionType === "riksdag"
                          ? "Sverige"
                          : "Europaval"
                  }
                  onRemoveParty={handleRemoveParty}
                  onReorderParty={handleReorderParty}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 opacity-40" />
                  </div>
                  <h3 className="font-medium mb-1">Ingen valsedel ännu</h3>
                  <p className="text-sm opacity-60">
                    Välj en valtyp för att börja skapa din valsedel
                  </p>
                </div>
              )}
            </section>

            {/* Info box */}
            {selectedParties.length > 0 && (
              <div className="alert alert-info mt-4">
                <div>
                  <h4 className="font-medium mb-1">Om Ranked Choice Voting</h4>
                  <p className="text-sm">
                    Med ranked choice voting rangordnar du dina val. Om ditt
                    förstahandsval inte får tillräckligt med röster, räknas din
                    röst istället för ditt andrahandsval.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-base-300 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm opacity-60">
          <p>
            Valsedel - Ett proof-of-concept för ranked choice voting i
            Sverige
          </p>
        </div>
      </footer>
    </div>
  );
}

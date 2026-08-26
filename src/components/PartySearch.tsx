"use client";

import { useState, useEffect, useRef } from "react";
import { LoaderCircle, User } from "lucide-react";

export interface Kandidat {
  id: string;
  nummer: number;
  namn: string;
  info?: string;
}

export interface Party {
  id: string;
  kod: string;
  beteckning: string;
  forkortning: string | null;
  logoUrl: string | null;
  type?: "party" | "candidate";
  kandidat?: Kandidat;
}

interface PartySearchProps {
  onSelect: (party: Party) => void;
  selectedParties: Party[];
  maxSelections?: number;
}

function PartyLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return <div className="font-medium text-lg py-1">{name}</div>;
  }

  return (
    // Partidata symbols will be local object URLs from the constituency bundle.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      className="max-h-10 w-auto object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function PartySearch({
  onSelect,
  selectedParties,
  maxSelections = 3,
}: PartySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search parties when query changes
  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/partier?search=${encodeURIComponent(query)}&limit=10`
        );
        const data = await res.json();
        // Filter out already selected parties
        const filtered = (data.parties || []).filter(
          (p: Party) => !selectedParties.some((sp) => sp.id === p.id)
        );
        setResults(filtered);
        setShowDropdown(true);
      } catch (error) {
        console.error("Failed to search parties:", error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedParties]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (party: Party) => {
    onSelect(party);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const isDisabled = selectedParties.length >= maxSelections;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">
        Välj parti {selectedParties.length > 0 && `(${selectedParties.length}/${maxSelections})`}
      </h2>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={
            isDisabled
              ? `Max ${maxSelections} partier valda`
              : "Sök parti eller kandidat..."
          }
          disabled={isDisabled}
          className="input input-bordered w-full"
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
            <LoaderCircle size={16} className="animate-spin" />
          </div>
        )}

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 menu bg-base-100 rounded-box shadow-lg max-h-64 overflow-y-auto p-0"
          >
            {results.map((party) => (
              <button
                key={party.id}
                onClick={() => handleSelect(party)}
                className="w-full px-4 py-3 hover:bg-base-200 text-left border-b border-base-200 last:border-b-0"
              >
                {party.type === "candidate" && party.kandidat ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                      <User size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{party.kandidat.namn}</div>
                      <div className="text-sm opacity-60 truncate">
                        {party.beteckning}
                        {party.kandidat.info && ` · ${party.kandidat.info}`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <PartyLogo logoUrl={party.logoUrl} name={party.beteckning} />
                )}
              </button>
            ))}
          </div>
        )}

        {showDropdown && query.length > 0 && results.length === 0 && !loading && (
          <div className="absolute z-10 w-full mt-1 bg-base-100 rounded-box shadow-lg p-4 text-center opacity-60">
            Inga partier eller kandidater hittades
          </div>
        )}
      </div>
    </div>
  );
}

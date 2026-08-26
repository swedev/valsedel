"use client";

import { useState, useEffect } from "react";
import type { ElectionType } from "./ElectionTypeSelector";

interface Region {
  id: string;
  kod: string;
  namn: string;
  typ: "lan" | "kommun";
  parentId: string | null;
}

interface RegionSelectorProps {
  electionType: ElectionType;
  selectedLan: Region | null;
  selectedKommun: Region | null;
  onLanChange: (lan: Region | null) => void;
  onKommunChange: (kommun: Region | null) => void;
}

export function RegionSelector({
  electionType,
  selectedLan,
  selectedKommun,
  onLanChange,
  onKommunChange,
}: RegionSelectorProps) {
  const [lan, setLan] = useState<Region[]>([]);
  const [kommuner, setKommuner] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch län on mount
  useEffect(() => {
    async function fetchLan() {
      try {
        const res = await fetch("/api/regioner?typ=lan");
        const data = await res.json();
        setLan(data.regions || []);
      } catch (error) {
        console.error("Failed to fetch län:", error);
      }
    }
    fetchLan();
  }, []);

  // Fetch kommuner when län changes
  useEffect(() => {
    if (!selectedLan || electionType !== "kommun") {
      setKommuner([]);
      return;
    }

    const lanKod = selectedLan.kod;

    async function fetchKommuner() {
      setLoading(true);
      try {
        const res = await fetch(`/api/regioner?typ=kommun&lanKod=${lanKod}`);
        const data = await res.json();
        setKommuner(data.regions || []);
      } catch (error) {
        console.error("Failed to fetch kommuner:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchKommuner();
  }, [selectedLan, electionType]);

  // Don't show for riksdag or EU elections
  if (electionType === "riksdag" || electionType === "eu") {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {electionType === "region" ? "Välj region" : "Välj kommun"}
      </h2>

      {/* Län selector */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Län</span>
        </label>
        <select
          value={selectedLan?.kod || ""}
          onChange={(e) => {
            const selected = lan.find((l) => l.kod === e.target.value) || null;
            onLanChange(selected);
            onKommunChange(null);
          }}
          className="select select-bordered w-full"
        >
          <option value="">Välj län...</option>
          {lan.map((l) => (
            <option key={l.id} value={l.kod}>
              {l.namn}
            </option>
          ))}
        </select>
      </div>

      {/* Kommun selector (only for kommunval) */}
      {electionType === "kommun" && selectedLan && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Kommun</span>
          </label>
          {loading ? (
            <div className="text-sm py-2 opacity-60">Laddar kommuner...</div>
          ) : (
            <select
              value={selectedKommun?.kod || ""}
              onChange={(e) => {
                const selected =
                  kommuner.find((k) => k.kod === e.target.value) || null;
                onKommunChange(selected);
              }}
              className="select select-bordered w-full"
            >
              <option value="">Välj kommun...</option>
              {kommuner.map((k) => (
                <option key={k.id} value={k.kod}>
                  {k.namn}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

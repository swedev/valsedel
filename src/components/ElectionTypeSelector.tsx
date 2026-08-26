"use client";

import { CircleCheck } from "lucide-react";

export type ElectionType = "riksdag" | "region" | "kommun" | "eu";

interface ElectionTypeOption {
  value: ElectionType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const electionTypes: ElectionTypeOption[] = [
  {
    value: "riksdag",
    label: "Riksdagsval",
    description: "Val till Sveriges riksdag",
    color: "#B8860B",
    bgColor: "#F7F6C2",
  },
  {
    value: "region",
    label: "Regionval",
    description: "Val till regionfullmäktige",
    color: "#1E40AF",
    bgColor: "#CDE6F7",
  },
  {
    value: "kommun",
    label: "Kommunval",
    description: "Val till kommunfullmäktige",
    color: "#374151",
    bgColor: "#FFFFFF",
  },
  {
    value: "eu",
    label: "EU-val",
    description: "Val till Europaparlamentet",
    color: "#1D4ED8",
    bgColor: "#FFFFFF",
  },
];

interface ElectionTypeSelectorProps {
  value: ElectionType | null;
  onChange: (type: ElectionType) => void;
}

export function ElectionTypeSelector({
  value,
  onChange,
}: ElectionTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Välj valtyp</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {electionTypes.map((type) => {
          const isSelected = value === type.value;
          return (
            <button
              key={type.value}
              onClick={() => onChange(type.value)}
              className={`card border-2 p-4 text-left transition-all ${
                isSelected ? "border-primary ring-2 ring-primary/20" : "border-base-300 hover:border-base-content/30"
              }`}
              style={{
                backgroundColor: isSelected ? type.bgColor : undefined,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full mt-0.5 shrink-0"
                  style={{ backgroundColor: type.color }}
                />
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm opacity-60">{type.description}</div>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 text-primary">
                  <CircleCheck size={18} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { electionTypes };

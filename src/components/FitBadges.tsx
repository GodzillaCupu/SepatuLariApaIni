import React from "react";
import { RunningShoe } from "@/types";
import { SIZING_META, BREATHABILITY_META } from "@/constants/fit";

export function FitBadges({ shoe }: { shoe: RunningShoe }) {
  const sizing = shoe.sizing ?? "unknown";
  const breath = shoe.breathability ?? "unknown";
  if (sizing === "unknown" && breath === "unknown") return null;
  const items = [
    sizing !== "unknown" ? SIZING_META[sizing] : null,
    breath !== "unknown" ? BREATHABILITY_META[breath] : null,
  ].filter(Boolean) as { label: string; hint: string; cls: string }[];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((m) => (
        <span key={m.label} title={m.hint} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls}`}>
          {m.label}
        </span>
      ))}
    </div>
  );
}

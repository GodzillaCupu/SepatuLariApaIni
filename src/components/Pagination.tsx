"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Nomor halaman ringkas: 1 … 4 5 6 … 12 */
function pageItems(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1]);
  const nums = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const base = "h-8 min-w-8 px-2 rounded-full text-xs font-semibold border transition-colors flex items-center justify-center";
  const idle = "bg-white text-slate-600 border-slate-200 hover:border-emerald-300";

  return (
    <nav aria-label="Halaman" className="flex items-center justify-center gap-1.5 pt-4 flex-wrap">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className={`${base} ${idle} disabled:opacity-40 disabled:pointer-events-none`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pageItems(page, totalPages).map((it, i) =>
        it === "…" ? (
          <span key={`gap-${i}`} className="text-xs text-slate-400 px-1">…</span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it)}
            aria-current={it === page ? "page" : undefined}
            className={`${base} ${it === page ? "bg-emerald-600 text-white border-emerald-600" : idle}`}
          >
            {it}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
        className={`${base} ${idle} disabled:opacity-40 disabled:pointer-events-none`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

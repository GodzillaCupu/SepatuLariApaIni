"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Footprints } from "lucide-react";

interface Props {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Foto sepatu dengan fallback ikon bila URL kosong / gagal dimuat. */
export function ShoeImage({ src, alt, sizes, priority, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-slate-50 ${className}`}>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-contain p-2"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Footprints className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}

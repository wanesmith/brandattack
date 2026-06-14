"use client";
import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-[var(--surface)] text-sm text-[var(--muted)]">
        No image
      </div>
    );
  }
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-md bg-[var(--surface)]">
        <Image
          key={images[active]}
          src={images[active]}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={
                "relative aspect-square overflow-hidden rounded-sm border transition-colors " +
                (i === active ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-white/40")
              }
              aria-label={`View image ${i + 1}`}
            >
              <Image src={src} alt={`${alt} ${i + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

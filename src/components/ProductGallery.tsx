"use client";
import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-paper-warm">
        <span className="label-mono text-ink-faded">No image</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      {/* Thumbnail rail — vertical on the left, only show if 2+ images */}
      {images.length > 1 && (
        <div className="hidden w-16 shrink-0 flex-col gap-3 sm:flex">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={
                "relative aspect-square overflow-hidden bg-paper-warm transition-all " +
                (i === active
                  ? "ring-2 ring-ink"
                  : "opacity-60 hover:opacity-100")
              }
              aria-label={`View image ${i + 1}`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden bg-paper-warm">
        <Image
          key={images[active]}
          src={images[active]}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
          priority
        />
        {/* Image counter */}
        <div className="absolute bottom-4 right-4 font-mono text-xs tracking-wider text-ink-faded">
          {String(active + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </div>
      </div>

      {/* Mobile thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={
                "h-1.5 transition-all " +
                (i === active ? "w-8 bg-ink" : "w-1.5 bg-ink-faded")
              }
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

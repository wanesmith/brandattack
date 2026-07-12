"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

// Full-bleed hero background that crossfades through several images.
// Relative paths use next/image (optimized, first one prioritized for LCP);
// absolute URLs (e.g. Vercel Blob) render as a plain <img>.
export function HeroCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0">
      {images.map((src, i) => {
        const active = i === idx;
        const isRelative = src.startsWith("/");
        return (
          <div
            key={src}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
              active ? "opacity-90" : "opacity-0"
            }`}
          >
            {isRelative ? (
              <Image
                src={src}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover object-center"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-full w-full object-cover object-center" />
            )}
          </div>
        );
      })}
    </div>
  );
}

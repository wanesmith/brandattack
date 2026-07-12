"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = { url: string; href: string };

// Full-bleed hero background that crossfades through several images. The active
// slide is a link (usually to the featured product). Relative paths use
// next/image (first prioritized for LCP); absolute URLs render as a plain img.
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="absolute inset-0">
      {slides.map((slide, i) => {
        const active = i === idx;
        const isRelative = slide.url.startsWith("/");
        return (
          <div
            key={slide.url}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
              active ? "opacity-90" : "pointer-events-none opacity-0"
            }`}
          >
            {isRelative ? (
              <Image
                src={slide.url}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover object-center"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.url} alt="" className="h-full w-full object-cover object-center" />
            )}
            {active && slide.href && (
              <Link href={slide.href} aria-label="View product" className="absolute inset-0 z-[1]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

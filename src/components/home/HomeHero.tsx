"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { MouseEventHandler } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/components/ui/cn";

type HeroCta = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  icon?: "arrow" | "pin";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

type HomeHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: HeroCta[];
  image: { src: string; width?: number; height?: number; alt?: string };
};

/** Production homepage hero presentation, retaining the runtime banner image and current CTAs. */
export function HomeHero({ eyebrow, title, description, ctas, image }: HomeHeroProps) {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="container home-hero-grid">
        <div className="home-hero-copy">
          <p className="home-hero-eyebrow">{eyebrow}</p>
          <h1 id="home-hero-title">{title}</h1>
          <p>{description}</p>
          <div className="hero-actions">
            {ctas.map((cta) => (
              <Link
                key={cta.label}
                className={cn(
                  cta.variant === "secondary"
                    ? "home-hero-dealer"
                    : cta.variant === "ghost"
                      ? "home-hero-become"
                      : cn(buttonVariants({ variant: "primary", size: "lg" }), "home-hero-cta")
                )}
                href={cta.href}
                prefetch={false}
                onClick={cta.onClick}
              >
                {cta.label}
                {cta.icon === "arrow" ? <ArrowRight size={17} aria-hidden="true" /> : null}
                {cta.icon === "pin" ? <MapPin size={17} aria-hidden="true" /> : null}
              </Link>
            ))}
          </div>
        </div>
        <div className="home-hero-media">
          <img
            src={image.src}
            alt={image.alt ?? ""}
            width={image.width ?? 1672}
            height={image.height ?? 941}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import clsx from "clsx";
import { useEffectPreferences } from "@/components/effects";

const POSES = new Set([
  "coach",
  "point",
  "listen",
  "think",
  "correct",
  "encourage",
  "victory",
  "guard",
  "reader",
  "rest",
]);

export function Mascot({
  pose = "coach",
  motion = "breathe",
  size = 120,
  priority = false,
  decorative = true,
  alt,
  className,
}) {
  const preferences = useEffectPreferences();
  const safePose = POSES.has(pose) ? pose : "coach";
  return (
    <span
      className={clsx(
        "mascot",
        `mascot-${safePose}`,
        preferences.motion && motion && `mascot-motion-${motion}`,
        className,
      )}
      style={{ "--mascot-size": `${size}px` }}
      aria-hidden={decorative ? "true" : undefined}
    >
      <Image
        src={`/brand/morkva/${safePose}.png`}
        alt={decorative ? "" : alt || "Морква"}
        width={size}
        height={size}
        priority={priority}
        sizes={`${size}px`}
      />
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

export const EFFECT_KEYS = Object.freeze({
  sound: "tactlex-sound-effects",
  motion: "tactlex-motion-effects",
});

function storedEnabled(key) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key) !== "false";
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function effectPreferences() {
  return {
    sound: storedEnabled(EFFECT_KEYS.sound),
    motion: storedEnabled(EFFECT_KEYS.motion) && !prefersReducedMotion(),
  };
}

export function setEffectPreference(kind, enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EFFECT_KEYS[kind], String(Boolean(enabled)));
  window.dispatchEvent(new CustomEvent("tactlex:effects-changed"));
}

export function useEffectPreferences() {
  const [preferences, setPreferences] = useState({ sound: true, motion: true });
  useEffect(() => {
    const sync = () => setPreferences(effectPreferences());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("tactlex:effects-changed", sync);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reducedMotion?.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tactlex:effects-changed", sync);
      reducedMotion?.removeEventListener?.("change", sync);
    };
  }, []);
  return preferences;
}

let audioContext;

function tone(context, { frequency, endFrequency, duration, delay = 0, gain = 0.055, type }) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency ?? frequency, start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export async function playEffect(kind) {
  if (typeof window === "undefined" || !effectPreferences().sound) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
  if (kind === "correct") {
    tone(audioContext, { frequency: 520, endFrequency: 780, duration: 0.13 });
    tone(audioContext, { frequency: 780, endFrequency: 980, duration: 0.14, delay: 0.1 });
  } else if (kind === "wrong") {
    tone(audioContext, {
      frequency: 240,
      endFrequency: 155,
      duration: 0.24,
      gain: 0.045,
      type: "triangle",
    });
  } else if (kind === "finish") {
    [392, 523, 659, 784].forEach((frequency, index) =>
      tone(audioContext, {
        frequency,
        endFrequency: frequency * 1.04,
        duration: 0.24,
        delay: index * 0.105,
        gain: 0.05,
      }),
    );
  } else {
    tone(audioContext, { frequency: 440, endFrequency: 620, duration: 0.12, gain: 0.035 });
  }
}

export function Confetti({ active, subtle = false }) {
  const { motion } = useEffectPreferences();
  if (!active || !motion) return null;
  const count = subtle ? 10 : 32;
  return (
    <div className={clsx("confetti-layer", subtle && "is-subtle")} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          style={{
            "--confetti-index": index,
            "--confetti-x": `${(index * 37) % 100}%`,
            "--confetti-delay": `${(index % 8) * 45}ms`,
            "--confetti-drift": `${((index * 29) % 90) - 45}px`,
            "--confetti-color": ["#58b947", "#f4be2c", "#4389d8", "#d76f51", "#8c6ccf"][index % 5],
          }}
        />
      ))}
    </div>
  );
}

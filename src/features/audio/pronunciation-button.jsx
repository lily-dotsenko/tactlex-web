"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Square, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";

export function PronunciationButton({ term, audioUrl = null, lang = "en-US", compact = false }) {
  const t = useTranslations("Audio");
  const audioRef = useRef(null);
  const [state, setState] = useState("idle");
  const [mode, setMode] = useState(audioUrl ? "human" : "synthetic");

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speakWithTts() {
    if (!("speechSynthesis" in window)) {
      setState("unavailable");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setState("playing");
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("unavailable");
    setMode("synthetic");
    window.speechSynthesis.speak(utterance);
  }

  async function play() {
    if (state === "playing") {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setState("idle");
      return;
    }

    if (!audioUrl) {
      speakWithTts();
      return;
    }

    try {
      setState("loading");
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay = () => setState("playing");
      audio.onended = () => setState("idle");
      audio.onerror = speakWithTts;
      await audio.play();
      setMode("human");
    } catch {
      speakWithTts();
    }
  }

  const playing = state === "playing";
  const unavailable = state === "unavailable";
  return (
    <div className={clsx("pronunciation", compact && "pronunciation-compact")}>
      <button
        type="button"
        className="pronunciation-button"
        onClick={play}
        aria-label={t(playing ? "stop" : "play", { term })}
        aria-pressed={playing}
      >
        {state === "loading" ? (
          <LoaderCircle className="spin" size={21} aria-hidden="true" />
        ) : unavailable ? (
          <VolumeX size={21} aria-hidden="true" />
        ) : playing ? (
          <Square size={18} fill="currentColor" aria-hidden="true" />
        ) : (
          <Volume2 size={22} aria-hidden="true" />
        )}
      </button>
      {!compact && (
        <div className="pronunciation-copy" aria-live="polite">
          <strong>{unavailable ? t("unavailable") : t(mode)}</strong>
          {mode === "synthetic" && !unavailable && <small>{t("syntheticDisclosure")}</small>}
        </div>
      )}
    </div>
  );
}

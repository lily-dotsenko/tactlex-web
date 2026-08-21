"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Square, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";

export function PronunciationButton({ term, audioUrl = null, lang = "en-US", compact = false }) {
  const t = useTranslations("Audio");
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const startTimerRef = useRef(null);
  const watchdogRef = useRef(null);
  const [state, setState] = useState("idle");
  const [mode, setMode] = useState(audioUrl ? "human" : "synthetic");

  useEffect(() => {
    return () => {
      playbackTokenRef.current += 1;
      window.clearTimeout(startTimerRef.current);
      window.clearTimeout(watchdogRef.current);
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stopPlayback() {
    playbackTokenRef.current += 1;
    window.clearTimeout(startTimerRef.current);
    window.clearTimeout(watchdogRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
    utteranceRef.current = null;
    window.speechSynthesis?.cancel();
    setState("idle");
  }

  function speakWithTts() {
    if (!("speechSynthesis" in window) || !term.trim()) {
      setState("unavailable");
      return;
    }
    const synthesis = window.speechSynthesis;
    stopPlayback();
    const token = playbackTokenRef.current;
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.lang = lang;
    utterance.rate = 0.92;
    const voices = synthesis.getVoices();
    const requestedLanguage = lang.toLowerCase();
    const voice =
      voices.find((item) => item.lang.toLowerCase() === requestedLanguage) ??
      voices.find((item) => item.lang.toLowerCase().startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (playbackTokenRef.current === token) setState("playing");
    };
    utterance.onend = () => {
      if (playbackTokenRef.current !== token) return;
      window.clearTimeout(watchdogRef.current);
      utteranceRef.current = null;
      setState("idle");
    };
    utterance.onerror = (event) => {
      if (playbackTokenRef.current !== token) return;
      window.clearTimeout(watchdogRef.current);
      utteranceRef.current = null;
      setState(["canceled", "interrupted"].includes(event.error) ? "idle" : "unavailable");
    };
    utteranceRef.current = utterance;
    setMode("synthetic");
    setState("loading");

    // Chromium occasionally leaves a cancelled utterance in its queue. A short
    // delay flushes it before the next phrase and prevents silent/hanging audio.
    startTimerRef.current = window.setTimeout(() => {
      if (playbackTokenRef.current !== token) return;
      synthesis.cancel();
      synthesis.resume();
      synthesis.speak(utterance);
      watchdogRef.current = window.setTimeout(() => {
        if (playbackTokenRef.current !== token) return;
        synthesis.cancel();
        utteranceRef.current = null;
        setState("idle");
      }, 15_000);
    }, 40);
  }

  async function play() {
    if (["playing", "loading"].includes(state)) {
      stopPlayback();
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
      audio.onended = () => {
        audioRef.current = null;
        setState("idle");
      };
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

import { DomainError } from "@/server/services/errors";

export function areAudioUploadsEnabled(environment = process.env) {
  const value = environment.AUDIO_UPLOADS_ENABLED?.trim().toLocaleLowerCase("en-US");
  return !new Set(["0", "false", "no", "off"]).has(value);
}

export function requireAudioUploadsEnabled(environment = process.env) {
  if (!areAudioUploadsEnabled(environment)) {
    throw new DomainError(
      "FEATURE_DISABLED",
      "Завантаження аудіо вимкнене в цьому середовищі. Використовуйте TTS fallback.",
      503,
    );
  }
}

import { describe, expect, it } from "vitest";

import { validateAudioBuffer } from "@/server/services/audio-storage";
import { areAudioUploadsEnabled, requireAudioUploadsEnabled } from "@/lib/audio/config";

describe("audio upload validation", () => {
  it("recognizes an MP3 signature", () => {
    expect(() => validateAudioBuffer(Buffer.from("ID3safe-audio"), "audio/mpeg")).not.toThrow();
  });

  it("rejects a MIME claim without a matching signature", () => {
    expect(() => validateAudioBuffer(Buffer.from("not audio"), "audio/wav")).toThrowError(
      expect.objectContaining({ code: "INVALID_AUDIO" }),
    );
  });
});

describe("audio upload feature flag", () => {
  it("keeps uploads enabled by default for local development", () => {
    expect(areAudioUploadsEnabled({})).toBe(true);
  });

  it("returns a controlled service error when uploads are disabled", () => {
    expect(areAudioUploadsEnabled({ AUDIO_UPLOADS_ENABLED: "false" })).toBe(false);
    expect(() => requireAudioUploadsEnabled({ AUDIO_UPLOADS_ENABLED: "false" })).toThrowError(
      expect.objectContaining({ code: "FEATURE_DISABLED", status: 503 }),
    );
  });
});

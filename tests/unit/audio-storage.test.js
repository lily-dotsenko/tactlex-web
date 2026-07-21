import { describe, expect, it } from "vitest";

import { validateAudioBuffer } from "@/server/services/audio-storage";

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

// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Button, ProgressBar } from "@/components/ui";
import { PronunciationButton } from "@/features/audio/pronunciation-button";

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={typeof href === "string" ? href : "/"} {...props}>
      {children}
    </a>
  ),
}));

const messages = {
  Audio: {
    play: "Play pronunciation: {term}",
    stop: "Stop pronunciation: {term}",
    loading: "Loading audio",
    human: "Human recording",
    synthetic: "Synthetic voice",
    syntheticDisclosure: "System speech synthesis is being used.",
    unavailable: "Pronunciation is unavailable on this device",
  },
};

describe("UI foundations", () => {
  afterEach(cleanup);

  it("exposes progress semantics and clamps values", () => {
    render(<ProgressBar value={130} label="Lesson progress" />);
    const progress = screen.getByRole("progressbar", { name: "Lesson progress" });
    expect(progress).toHaveAttribute("aria-valuenow", "100");
  });

  it("keeps the default button type safe for forms", () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "button");
  });
});

describe("PronunciationButton", () => {
  beforeEach(() => {
    class MockUtterance {
      constructor(text) {
        this.text = text;
      }
    }
    window.SpeechSynthesisUtterance = MockUtterance;
    globalThis.SpeechSynthesisUtterance = MockUtterance;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: vi.fn(),
        getVoices: vi.fn(() => []),
        speak: vi.fn(),
      },
    });
  });

  afterEach(cleanup);

  it("discloses synthetic speech and exposes a term-specific label", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PronunciationButton term="rally point" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Synthetic voice")).toBeVisible();
    const button = screen.getByRole("button", { name: "Play pronunciation: rally point" });
    fireEvent.click(button);
    expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
  });
});

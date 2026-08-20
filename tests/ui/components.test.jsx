// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { PwaProvider } from "@/components/providers";
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
  Offline: {
    banner: "You are offline. Server progress is temporarily unavailable.",
    install: "Install",
    installText: "Install the application.",
    update: "An update is available.",
    updateAction: "Update",
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

  it("hydrates the PWA shell without replacing offline markup", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    const view = (
      <NextIntlClientProvider locale="en" messages={messages}>
        <PwaProvider>
          <main>Application</main>
        </PwaProvider>
      </NextIntlClientProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(view);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    let root;
    await act(async () => {
      root = hydrateRoot(container, view);
    });

    expect(container.querySelector("main")).toHaveTextContent("Application");
    expect(container.querySelector('[role="status"]')).toHaveTextContent("You are offline");
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("Hydration failed");
    await act(async () => root.unmount());
    consoleError.mockRestore();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
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

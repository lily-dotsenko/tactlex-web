// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { PwaProvider } from "@/components/providers";
import { CustomAvatar } from "@/components/custom-avatar";
import { Button, ProgressBar } from "@/components/ui";
import { PronunciationButton } from "@/features/audio/pronunciation-button";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { effectPreferences, setEffectPreference } from "@/components/effects";

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

  it("traps focus in the exit dialog and closes it with Escape", () => {
    const onClose = vi.fn();
    render(
      <AccessibleDialog open title="Leave lesson?" onClose={onClose}>
        <button type="button">Continue</button>
        <button type="button">Leave</button>
      </AccessibleDialog>,
    );
    screen.getByRole("button", { name: "Continue" });
    const closeButton = screen.getByRole("button", { name: "Close" });
    const leaveButton = screen.getByRole("button", { name: "Leave" });
    leaveButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("stores device-local sound and motion preferences", () => {
    const values = new Map();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
      },
    });
    setEffectPreference("sound", false);
    setEffectPreference("motion", false);
    expect(effectPreferences()).toEqual({ sound: false, motion: false });
    setEffectPreference("sound", true);
    setEffectPreference("motion", true);
  });

  it("renders a labelled tactical cat avatar from allowlisted parts", () => {
    render(
      <CustomAvatar
        title="Tactical cat preview"
        config={{
          catType: "maine-coon",
          gender: "neutral",
          coatColor: "ginger",
          coatPattern: "tabby",
          eyeColor: "green",
          equipment: "tactical-vest",
          weapon: "bow",
          accessory: "headset",
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Tactical cat preview" })).toBeVisible();
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

  it("shows the install reminder no more than twice for the browser profile", async () => {
    const values = new Map();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, String(value)),
      },
    });
    window.localStorage.clear();
    const view = (
      <NextIntlClientProvider locale="en" messages={messages}>
        <PwaProvider>
          <main>Application</main>
        </PwaProvider>
      </NextIntlClientProvider>
    );
    const dispatchInstallPrompt = async () => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = vi.fn();
      await act(async () => window.dispatchEvent(event));
    };

    let rendered = render(view);
    await dispatchInstallPrompt();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    rendered.unmount();

    rendered = render(view);
    await dispatchInstallPrompt();
    expect(screen.getByRole("complementary")).toBeVisible();
    rendered.unmount();

    rendered = render(view);
    await dispatchInstallPrompt();
    expect(screen.getByRole("complementary")).toBeVisible();
    rendered.unmount();

    rendered = render(view);
    await dispatchInstallPrompt();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("tactlex-install-prompt-shows")).toBe("2");
    rendered.unmount();
    window.localStorage.clear();
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
        resume: vi.fn(),
        speak: vi.fn(),
      },
    });
  });

  afterEach(cleanup);

  it("discloses synthetic speech and exposes a term-specific label", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PronunciationButton term="rally point" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Synthetic voice")).toBeVisible();
    const button = screen.getByRole("button", { name: "Play pronunciation: rally point" });
    fireEvent.click(button);
    await waitFor(() => expect(window.speechSynthesis.speak).toHaveBeenCalledOnce());
  });
});

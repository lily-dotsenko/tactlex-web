import "./globals.css";
import { ThemeProvider } from "@/components/providers";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "ТактЛекс — військова англійська",
    template: "%s · ТactLex",
  },
  description:
    "Безплатний двомовний тренажер військової англійської з короткими уроками й повтореннями.",
  applicationName: "TactLex",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/morkva-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/icons/morkva-192.png", type: "image/png", sizes: "192x192" }],
  },
  openGraph: {
    type: "website",
    title: "ТактЛекс — військова англійська",
    description: "Короткі уроки, точні повторення та перевірений двомовний словник.",
    siteName: "TactLex",
    images: [{ url: "/brand/social-preview.png", alt: "ТактЛекс і бойовий кіт Морква" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ТактЛекс — військова англійська",
    description: "Тренуй слова. Розумій команди.",
    images: ["/brand/social-preview.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#111613" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

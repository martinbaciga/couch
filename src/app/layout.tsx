import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/shell/AppHeader";
import { Footer } from "@/components/shell/Footer";
import { SearchProvider } from "@/components/shell/SearchProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
});

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("meta.title"),
    icons: {
      icon: [
        { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/brand/apple-touch-icon.png",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${bricolage.variable} ${figtree.variable}`}>
      <body className="flex min-h-dvh flex-col bg-surface-page font-sans text-text-default">
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <SearchProvider>
              <Suspense fallback={<div className="h-nav" />}>
                <AppHeader />
              </Suspense>
              <main className="mx-auto w-full min-w-0 max-w-page flex-1 px-gutter py-6">
                {children}
              </main>
              <Footer />
            </SearchProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

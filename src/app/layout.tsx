import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "AYMA — маркетплейс ИИ-стартапов", template: "%s · AYMA" },
  description:
    "Витрина ИИ-стартапов из Казахстана и СНГ. Поддержите проекты предзаказом их услуг — подписки, доработки, внедрения.",
  openGraph: { type: "website", locale: "ru_RU", siteName: "AYMA" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

// Светлая тема по умолчанию; тёмная — если пользователь выбрал её переключателем.
// Скрипт выполняется до гидрации, чтобы не было «мигания».
const themeScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashu — Talk to your database",
  description:
    "Dashu turns PostgreSQL into a conversational analytics interface. Ask in plain English and get tables and charts back.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set the theme before first paint so there is no flash of light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

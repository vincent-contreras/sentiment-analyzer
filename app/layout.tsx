import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentiment Analyzer",
  description: "AI agent that analyzes user sentiment for products and services using Twitter/X data via the Sela Network API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

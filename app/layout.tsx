import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenthra — Intelligence for the On-Chain World",
  description:
    "Zenthra is an AI agent for on-chain and futures market intelligence. Ask a question. Zenthra does the research.",
  keywords: [
    "on-chain intelligence",
    "crypto research",
    "futures intelligence",
    "market analysis",
  ],
  applicationName: "Zenthra",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zenthra-black text-zenthra-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

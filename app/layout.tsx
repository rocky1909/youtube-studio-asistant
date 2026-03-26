import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "YT Studio AI",
  description:
    "A multi-agent YouTube production cockpit for ideas, scripts, images, voice, and browser video assembly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={
          {
            "--font-body": '"Aptos", "Trebuchet MS", "Segoe UI", sans-serif',
            "--font-display": '"Impact", "Arial Black", sans-serif',
            "--font-mono": '"Consolas", "Courier New", monospace',
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Stack Scout",
  description: "Automated engineering research for B2B sales calls",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

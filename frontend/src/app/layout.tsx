import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sensory Audit — AI-Powered Autism-Friendly Space Analyzer",
  description: "Upload a video or describe any space. AI analyzes sensory load across visual, auditory, and social dimensions and provides autism-friendly recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sensory Audit - Autism-Friendly Space Analyzer",
  description: "Upload a video of any space. AI analyzes sensory load and gives autism-friendly suggestions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

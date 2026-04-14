import type { Metadata } from "next";
import "./globals.css";

const title = "Sensory Audit — Make Any Space Autism-Friendly";
const description = "Upload a video or describe any space. AI analyzes sensory load across visual, auditory, and social dimensions — and tells you exactly what to fix.";
const url = "https://sensory.mind.new";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  keywords: ["autism", "sensory processing", "accessibility audit", "inclusive design", "autism-friendly", "sensory overload", "AI"],
  authors: [{ name: "Ibrahim Raza" }, { name: "Meraj Faheem" }],
  creator: "Leeza Care",
  openGraph: {
    title, description, url,
    siteName: "Sensory Audit",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Sensory Audit — Make Any Space Autism-Friendly" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  robots: { index: true, follow: true },
  icons: { icon: "/brainlogo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

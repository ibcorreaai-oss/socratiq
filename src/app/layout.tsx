import type { Metadata } from "next";
import { Manrope, Cinzel } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Socratiq — Master anything, one question at a time",
  description:
    "Turn any notes, topic or lecture PDF into an adaptive knowledge battle. When you're wrong, Socratiq's Sage won't just tell you the answer — it asks the question that gets you there yourself.",
  metadataBase: new URL("https://socratiq.vercel.app"),
  openGraph: {
    title: "Socratiq — Master anything, one question at a time",
    description:
      "An AI study quest that teaches with questions, not answers. Battle knowledge golems, get Socratic hints, never forget what you learn.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}

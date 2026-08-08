import type { Metadata } from "next";
import "@/styles/index.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "CONSOLE | TalentBridge",
  description: "AI-Powered Recruitment Platform — Connect top talent with leading companies using AI-powered job matching, resume analysis, and automated candidate evaluation.",
  icons: {
    icon: "/favicon.png",
  },
  verification: {
    // Replace this value with your actual Google Search Console verification code
    // Get it from: https://search.google.com/search-console → Add property → HTML tag
    google: "QQ7LZ4GmLlkyyxkKxdSiWyzDWFkhoQr6GH9jvifrbhU"
  },
  openGraph: {
    title: "CONSOLE | TalentBridge",
    description: "AI-Powered Recruitment Platform — Connect top talent with leading companies.",
    url: "https://console-talent-bridge.vercel.app",
    siteName: "CONSOLE | TalentBridge",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      </head>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}

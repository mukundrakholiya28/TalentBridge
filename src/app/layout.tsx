import type { Metadata } from "next";
import "@/styles/index.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "TalentBridge — AI-Powered Recruitment Platform",
  description: "TalentBridge connects job seekers with employers using AI-powered job matching, resume analysis, semantic candidate search, online assessments, and Google Calendar interview scheduling.",
  icons: {
    icon: "/favicon.png",
  },
  verification: {
    google: "QQ7LZ4GmLlkyyxkKxdSiWyzDWFkhoQr6GH9jvifrbhU",
  },
  openGraph: {
    title: "TalentBridge — AI-Powered Recruitment Platform",
    description: "TalentBridge connects job seekers with employers using AI-powered matching, resume analysis, and automated hiring tools.",
    url: "https://console-talent-bridge.vercel.app",
    siteName: "TalentBridge",
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

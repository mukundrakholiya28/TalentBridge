import type { Metadata } from "next";
import "@/styles/index.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "TalentBridge — AI-Powered Recruitment Platform",
  description:
    "TalentBridge is an AI-powered recruitment platform that connects job seekers with employers. Candidates can upload resumes, get AI-matched to jobs, track applications, take assessments, and receive offer letters. Recruiters can post jobs, search candidates with semantic AI, schedule interviews via Google Calendar, and manage the full hiring pipeline.",
  keywords: [
    "TalentBridge",
    "AI recruitment platform",
    "job matching",
    "resume analysis",
    "hiring platform",
    "job search",
    "candidate tracking",
    "ATS",
  ],
  icons: {
    icon: "/favicon.png",
  },
  verification: {
    google: "QQ7LZ4GmLlkyyxkKxdSiWyzDWFkhoQr6GH9jvifrbhU",
  },
  openGraph: {
    title: "TalentBridge — AI-Powered Recruitment Platform",
    description:
      "TalentBridge connects job seekers with employers using AI-powered matching, resume analysis, semantic candidate search, and automated hiring tools.",
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

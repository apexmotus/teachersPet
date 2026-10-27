import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Teacher's PET — Digital companion for educators | Innobuntu Group",
    template: "%s | Teacher's PET",
  },
  description:
    "Teacher's PET digitises school administration across Africa. Manage attendance, lesson plans, learner records, and announcements — all in one platform. By Innobuntu Group.",
  keywords: [
    'school administration', 'EdTech', 'South Africa', 'teacher app',
    'attendance register', 'lesson plans', 'learner records', 'Innobuntu',
    'digital classroom', 'school management system',
  ],
  authors: [{ name: 'Innobuntu Group', url: 'https://www.innobuntu.co.za' }],
  creator: 'Innobuntu Group',
  openGraph: {
    type: 'website',
    siteName: "Teacher's PET",
    title: "Teacher's PET — Digital companion for educators",
    description:
      "Teacher's PET digitises school administration across Africa. Attendance, lesson plans, learner records and more — in one platform. By Innobuntu Group.",
    locale: 'en_ZA',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Teacher's PET — Digital companion for educators",
    description:
      "Teacher's PET digitises school administration across Africa. By Innobuntu Group.",
    creator: '@innobuntu',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

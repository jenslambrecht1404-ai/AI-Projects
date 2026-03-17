import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workbook & Buch Generator",
  description:
    "KI-gestützter Generator für professionelle Workbooks und Bücher aus Transkripten",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "lernfa.st - Learn. Fast. Accessible.",
  description: "Transform complex topics into visual micro-dosed learning cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Clarity",
  description: "Synthetic customer reviews into owner-approved actions",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

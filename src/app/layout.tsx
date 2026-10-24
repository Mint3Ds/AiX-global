import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Clarity | Review workspace",
  description: "Turn customer feedback into clear insights and meaningful action with Clarity.",
  icons: { icon: "/clarity-symbol.svg" },
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habesha Hub",
  description: "Discover and book Ethiopian community events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
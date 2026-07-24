import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav";

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
      <body style={{ paddingBottom: 70 }}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
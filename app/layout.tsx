import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import NotificationProvider from "@/components/notification/NotificationProvider";
import OnboardingProvider from "@/components/onboarding/OnboardingProvider";

export const metadata: Metadata = {
  title: "Habesha Hub",
  description: "Discover and book Ethiopian community events",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ paddingBottom: 84 }}>
        <AuthProvider>
          <NotificationProvider>
            <OnboardingProvider>
              {children}
            </OnboardingProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

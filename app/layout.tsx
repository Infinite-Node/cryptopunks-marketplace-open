import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "./lib/wallet";
import { MobileWalletBar } from "./components/SiteChrome";

export const metadata: Metadata = {
  title: "cryptopunks open source",
  description:
    "a minimal onchain viewer and write client for the cryptopunks contract.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col pb-16 sm:pb-0">
        <WalletProvider>
          {children}
          <MobileWalletBar />
        </WalletProvider>
      </body>
    </html>
  );
}

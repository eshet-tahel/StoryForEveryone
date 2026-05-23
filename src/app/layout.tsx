import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Story For Everyone",
  description: "Interactive family storytelling game",
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
};

export default RootLayout;

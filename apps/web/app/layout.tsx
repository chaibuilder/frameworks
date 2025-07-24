import "@/app/(public)/public.css";
import { FontsAndStyles } from "chai-next";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chai Builder",
  description: "Chai Builder",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`smooth-scroll`} suppressHydrationWarning>
      <head>
        <FontsAndStyles />
      </head>
      <body className={`font-body antialiased`}>{children}</body>
    </html>
  );
}

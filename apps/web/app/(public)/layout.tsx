import { FontsAndStyles } from "chai-next/blocks/rsc";
import ChaiBuilder from "chai-next/server";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import "./public.css";

ChaiBuilder.init(process.env.CHAIBUILDER_API_KEY!);

export const metadata: Metadata = {
  title: "Chai Builder",
  description: "Chai Builder",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isEnabled } = await draftMode();
  await ChaiBuilder.loadSiteSettings(isEnabled);
  return (
    <html className={`smooth-scroll`}>
      <head>
        <FontsAndStyles />
      </head>
      <body className={`font-body antialiased`}>{children}</body>
    </html>
  );
}

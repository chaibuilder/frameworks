import ChaiBuilder from "chai-next/server";
import type { Metadata } from "next";
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
  return <html className={`smooth-scroll`}>{children}</html>;
}

import type { Metadata } from "next";
import "./public.css";

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

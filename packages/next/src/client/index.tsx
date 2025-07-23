"use client";
import dynamic from "next/dynamic";
import type { FC } from "react";
import "../../styles";

// Only re-export specific items from @chaibuilder/pages to avoid interface conflicts
export * from "@chaibuilder/pages";
export * from "@chaibuilder/sdk/ui";

// Use a type assertion to avoid the TypeScript error with interfaces
export const ChaiBuilderPagesNext = dynamic(
  () =>
    import("@chaibuilder/pages").then((mod) => mod.default) as Promise<FC<any>>,
  { ssr: false }
);

export default ChaiBuilderPagesNext;

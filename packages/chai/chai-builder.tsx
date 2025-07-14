"use client";

import ChaiBuilderPages from "@chaibuilder/pages";

import React from "react";

const Logo = () => <h1 className="text-xl font-bold">Chai Builder</h1>;

export default function ChaiBuilder() {
  return (
    <ChaiBuilderPages
      getPreviewUrl={(slug: string) => {
        return `/chai/preview?slug=${slug}`;
      }}
      getLiveUrl={(slug: string) => {
        return `/chai/preview?disable=true&slug=${slug}`;
      }}
      autoSaveSupport={false}
      logo={Logo}
    />
  );
}

"use client";

import ChaiBuilder from "chai-next";
import "chai-next/builder-styles";

export default function Page() {
  return (
    <ChaiBuilder
      apiUrl={"/builder/api"}
      usersApiUrl={"/builder/api"}
      assetsApiUrl={"/builder/api"}
    />
  );
}

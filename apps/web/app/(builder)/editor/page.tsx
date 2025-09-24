"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChaiBuilder from "chai-next";
import "chai-next/builder-styles";

const queryClient = new QueryClient();
export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChaiBuilder hasReactQueryProvider apiUrl="/builder/api" />
    </QueryClientProvider>
  );
}

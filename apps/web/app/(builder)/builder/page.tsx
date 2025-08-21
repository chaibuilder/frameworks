"use client";

import { registerBlocks } from "@/blocks";
import ChaiBuilder from "chai-next";
import "chai-next/builder-styles";
import "../../../blocks/accordion";
import "../../../blocks/aspect-ratio";
import "../../../blocks/avatar";
import "../../../blocks/badge";
import "../../../blocks/popover";
import "../../../blocks/text-reveal";
import "../../../blocks/typewriter-effect";

registerBlocks();

export default function Page() {
  return <ChaiBuilder />;
}

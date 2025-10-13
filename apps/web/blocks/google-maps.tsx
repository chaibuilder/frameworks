"use client";

import { GoogleMapsEmbed } from "@next/third-parties/google";
import {
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";

const GoogleMapsBlock = (
  props: ChaiBlockComponentProps<{
    apiKey: string;
    height: number;
    width: string;
    q: string;
    styles: ChaiStyles;
  }>,
) => {
  const { apiKey, height, width, q, styles } = props;

  return (
    <div {...props.blockProps} {...styles}>
      <GoogleMapsEmbed apiKey={apiKey} mode={"place"} height={height} width={width} q={q} />
    </div>
  );
};

registerChaiBlock(GoogleMapsBlock, {
  type: "Google/MapsEmbed",
  label: "Google Maps Embed",
  category: "core",
  group: "Google",
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      apiKey: {
        type: "string",
        title: "API Key",
        default: "",
        description: "Your Google Maps API Key",
      },
      height: {
        type: "number",
        title: "Height",
        default: 400,
      },
      width: {
        type: "string",
        title: "Width",
        default: "100%",
      },
      q: {
        type: "string",
        title: "Location",
        default: "Brooklyn Bridge, New York, NY",
      },
    },
  }),
  i18nProps: ["q"],
  aiProps: ["q"],
});

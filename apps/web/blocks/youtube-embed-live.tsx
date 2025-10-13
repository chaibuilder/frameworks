"use client";

import { YouTubeEmbed } from "@next/third-parties/google";
import {
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";

const YouTubeEmbedLiveBlock = (
  props: ChaiBlockComponentProps<{
    videoid: string;
    height: number;
    width?: number;
    playlabel?: string;
    autoplay?: boolean;
    mute?: boolean;
    controls?: boolean;
    loop?: boolean;
    styles: ChaiStyles;
  }>,
) => {
  const {
    videoid,
    height,
    width = 640,
    autoplay = false,
    mute = false,
    controls = true,
    loop = false,
    styles,
  } = props;

  // Build params string from individual options
  const paramsArray: string[] = [];
  if (autoplay) paramsArray.push("autoplay=1");
  if (mute) paramsArray.push("mute=1");
  if (!controls) paramsArray.push("controls=0");
  if (loop) paramsArray.push("loop=1", `playlist=${videoid}`);
  const paramsString = paramsArray.join("&");

  return (
    <div {...props.blockProps} {...styles}>
      <YouTubeEmbed
        videoid={videoid}
        height={height}
        width={width}
        params={paramsString}
      />
    </div>
  );
};

// Register with the SAME type as the builder version
registerChaiBlock(YouTubeEmbedLiveBlock, {
  type: "Google/YouTubeEmbed",
  label: "YouTube Embed",
  category: "core",
  group: "Google",
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      videoid: {
        type: "string",
        title: "Video ID",
        default: "JCG7BR6SbW4",
        description: "YouTube video ID (from the URL)",
      },
      height: {
        type: "number",
        title: "Height",
        default: 400,
      },
      width: {
        type: "number",
        title: "Width",
        default: 640,
      },
      playlabel: {
        type: "string",
        title: "Play Label",
        default: "Play",
      },
      autoplay: {
        type: "boolean",
        title: "Autoplay",
        default: false,
      },
      mute: {
        type: "boolean",
        title: "Mute",
        default: false,
      },
      controls: {
        type: "boolean",
        title: "Show Controls",
        default: true,
      },
      loop: {
        type: "boolean",
        title: "Loop",
        default: false,
      },
    },
  }),
  i18nProps: ["playlabel"],
  aiProps: ["videoid"],
});

"use client";

import {
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";
import { useEffect, useRef, useState } from "react";

const YouTubeEmbedBlock = (
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
    playlabel = "Play",
    autoplay = false,
    mute = false,
    controls = true,
    loop = false,
    styles,
  } = props;
  const [isLoaded, setIsLoaded] = useState(autoplay);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build YouTube URL parameters based on options
  const buildParams = (includeAutoplay = false) => {
    const params: string[] = [];
    if (includeAutoplay || autoplay) params.push("autoplay=1");
    if (mute) params.push("mute=1");
    if (!controls) params.push("controls=0");
    if (loop) params.push("loop=1", `playlist=${videoid}`);
    return params.length > 0 ? `?${params.join("&")}` : "";
  };

  const embedUrl = `https://www.youtube.com/embed/${videoid}`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoid}/hqdefault.jpg`;

  useEffect(() => {
    // Load the lite-youtube-embed CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/lite-youtube-embed@0.3.2/src/lite-yt-embed.css";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleClick = () => {
    setIsLoaded(true);
  };

  return (
    <div {...props.blockProps} {...styles}>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: width ? `${width}px` : "100%",
          maxWidth: "100%",
          height: `${height}px`,
          backgroundColor: "#000",
          cursor: isLoaded ? "default" : "pointer",
        }}
        onClick={!isLoaded ? handleClick : undefined}>
        {!isLoaded ? (
          <>
            {/* Thumbnail */}
            <img
              src={thumbnailUrl}
              alt={playlabel}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              loading="lazy"
            />
            {/* Play Button */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "68px",
                height: "48px",
                backgroundColor: "rgba(255, 0, 0, 0.9)",
                borderRadius: "12px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgb(255, 0, 0)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
              }}>
              <svg
                viewBox="0 0 68 48"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  height: "100%",
                }}>
                <path
                  d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
                  fill="#fff"
                />
                <path d="M 45,24 27,14 27,34" fill="#ff0000" />
              </svg>
            </div>
          </>
        ) : (
          <iframe
            width="100%"
            height="100%"
            src={`${embedUrl}${buildParams(true)}`}
            title={playlabel}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </div>
    </div>
  );
};

registerChaiBlock(YouTubeEmbedBlock, {
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
        description: "Height in pixels",
      },
      width: {
        type: "number",
        title: "Width",
        default: "auto",
        description: "Width in pixels (leave empty for auto)",
      },
      playlabel: {
        type: "string",
        title: "Play Label",
        default: "Play",
        description: "Accessible play button label",
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

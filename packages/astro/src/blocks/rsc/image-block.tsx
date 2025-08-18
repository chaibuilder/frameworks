import { ChaiBlockComponentProps, ChaiStyles } from "@chaibuilder/pages/runtime";
import { first, isArray } from "lodash";
import * as React from "react";

export const ImageBlock = (
  props: ChaiBlockComponentProps<{
    height: string;
    width: string;
    alt: string;
    styles: ChaiStyles;
    lazyLoading: boolean;
    image: string;
  }>,
) => {
  const { image, styles, alt, height, width, lazyLoading } = props;

  // If width or height are missing/invalid, use CSS object-fit
  const shouldUseFill = !width || !height || isNaN(parseInt(width)) || isNaN(parseInt(height));

  const src = isArray(image) ? first(image)?.trimEnd() : image?.trimEnd();

  const imageElement = React.createElement("img", {
    ...styles,
    src,
    alt: alt || "",
    loading: lazyLoading ? "lazy" : "eager",
    height: shouldUseFill ? undefined : parseInt(height),
    width: shouldUseFill ? undefined : parseInt(width),
    style: {
      ...(typeof styles?.style === "object" ? styles.style : {}),
      ...(shouldUseFill
        ? {
            width: "100%",
            height: "100%",
            objectFit: "cover" as const,
          }
        : {}),
    },
  });

  if (shouldUseFill) {
    return React.createElement(
      "div",
      {
        className: "relative flex w-full h-full",
        style: { position: "relative" },
      },
      imageElement,
    );
  }

  return imageElement;
};

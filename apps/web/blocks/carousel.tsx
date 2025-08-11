import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";
import { cn } from "@/lib/utils";
import * as React from "react";

const ShadcnCarousel = (
  props: ChaiBlockComponentProps<{
    orientation?: "horizontal" | "vertical";
    showPrevious?: boolean;
    showNext?: boolean;
    loop?: boolean;
    align?: "start" | "center" | "end";
    slidesToScroll?: number;
    dragFree?: boolean;
    duration?: number;
    startIndex?: number;
    containerStyles: ChaiStyles;
    prevButtonStyles: ChaiStyles;
    nextButtonStyles: ChaiStyles;
  }>
) => {
  const opts = {
    align: props.align || "start",
    loop: props.loop || false,
    slidesToScroll: props.slidesToScroll || 1,
    dragFree: props.dragFree || false,
    duration: props.duration || 25,
    startIndex: props.startIndex || 0,
  };

  return (
    <Carousel
      {...props.blockProps}
      opts={opts}
      orientation={props.orientation}
      className={cn(
        "w-full max-w-full mx-auto",
        props.orientation === "vertical"
          ? "min-h-60 h-80 my-auto flex flex-col"
          : ""
      )}
      {...props.containerStyles}
    >
      <CarouselContent className="ml-0">{props.children}</CarouselContent>
      {props.showPrevious && <CarouselPrevious  {...props.prevButtonStyles} />}
      {props.showNext && <CarouselNext {...props.nextButtonStyles} />}
    </Carousel>
  );
};

const ShadcnCarouselItem = (
  props: ChaiBlockComponentProps<{
    style: ChaiStyles;
  }>
) => {
  return (
    <CarouselItem {...props.blockProps} {...props.style}>
      {props.children}
    </CarouselItem>
  );
};

registerChaiBlock(ShadcnCarouselItem, {
  type: "Shadcn/CarouselItem",
  label: "Carousel Item",
  category: "core",
  group: "Shadcn",
  blocks() {
    return [
      {
        _id: "carousel-item-root",
        _type: "Shadcn/CarouselItem",
      },
      {
        _id: "carousel-item-content",
        _type: "Paragraph",
        _parent: "carousel-item-root",
        content: "This is a carousel item. Add your content here.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      style: stylesProp(""),
    },
  }),
  canAcceptBlock: () => true,
});

registerChaiBlock(ShadcnCarousel, {
  type: "Shadcn/Carousel",
  label: "Carousel",
  category: "core",
  group: "Shadcn",
  blocks() {
    return [
      {
        _id: "carousel-root",
        _type: "Shadcn/Carousel",
        orientation: "horizontal",
        showPrevious: true,
        showNext: true,
        loop: true,
        align: "start",
        slidesToScroll: 1,
        dragFree: false,
        duration: 25,
        startIndex: 0,
      },
      {
        _id: "carousel-item-1",
        _type: "Shadcn/CarouselItem",
        _parent: "carousel-root",
      },
      {
        _id: "carousel-content-1",
        _type: "Paragraph",
        _parent: "carousel-item-1",
        content:
          "Slide 1: This is the first carousel item. Add any content here.",
      },
      {
        _id: "carousel-item-2",
        _type: "Shadcn/CarouselItem",
        _parent: "carousel-root",
      },
      {
        _id: "carousel-content-2",
        _type: "Paragraph",
        _parent: "carousel-item-2",
        content:
          "Slide 2: This is the second carousel item. Customize as needed.",
      },
      {
        _id: "carousel-item-3",
        _type: "Shadcn/CarouselItem",
        _parent: "carousel-root",
      },
      {
        _id: "carousel-content-3",
        _type: "Paragraph",
        _parent: "carousel-item-3",
        content:
          "Slide 3: This is the third carousel item. Perfect for showcasing content.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      containerStyles: stylesProp(""),
      prevButtonStyles: stylesProp(""),
      nextButtonStyles: stylesProp(""),
      orientation: {
        type: "string",
        title: "Orientation",
        enum: ["horizontal", "vertical"],
        default: "horizontal",
      },
      showPrevious: {
        type: "boolean",
        title: "Show Previous Button",
        default: true,
      },
      showNext: {
        type: "boolean",
        title: "Show Next Button",
        default: true,
      },
      loop: {
        type: "boolean",
        title: "Loop",
        description: "Enable infinite loop",
        default: true,
      },
      align: {
        type: "string",
        title: "Alignment",
        enum: ["start", "center", "end"],
        default: "start",
        description: "How to align the slides",
      },
      slidesToScroll: {
        type: "number",
        title: "Slides to Scroll",
        description: "Number of slides to scroll at once",
        default: 1,
        minimum: 1,
        maximum: 10,
      },
      dragFree: {
        type: "boolean",
        title: "Drag Free",
        description: "Allow free dragging without snap points",
        default: false,
      },
      duration: {
        type: "number",
        title: "Animation Duration",
        description: "Duration of scroll animation (in ms)",
        default: 25,
        minimum: 0,
        maximum: 100,
      },
      startIndex: {
        type: "number",
        title: "Start Index",
        description: "Initial slide index",
        default: 0,
        minimum: 0,
        maximum: 50,
      },
    },
  }),
  canAcceptBlock: (type) => type === "Shadcn/CarouselItem",
});

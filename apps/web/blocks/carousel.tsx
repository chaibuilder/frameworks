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

const ShadcnCarousel = (
  props: ChaiBlockComponentProps<{
    orientation: "horizontal" | "vertical";
    loop: boolean;
    showArrows: boolean;
    maxWidth: string;
    styles: ChaiStyles;
  }>
) => {
  return (
    <Carousel
      {...props.blockProps}
      opts={{
        align: "start",
        loop: props.loop,
      }}
      orientation={props.orientation}
      className={`w-full ${props.maxWidth} mx-auto`}
      {...props.styles}>
      <CarouselContent>
        {props.children}
      </CarouselContent>
      {props.showArrows && (
        <>
          <CarouselPrevious />
          <CarouselNext />
        </>
      )}
    </Carousel>
  );
};

const ShadcnCarouselItem = (
  props: ChaiBlockComponentProps<{
    itemStyles: ChaiStyles;
  }>
) => {
  return (
    <CarouselItem
      {...props.blockProps}
      {...props.itemStyles}>
      {props.children}
    </CarouselItem>
  );
};

registerChaiBlock(ShadcnCarouselItem, {
  type: "Shadcn/CarouselItem",
  label: "Carousel Item",
  category: "core",
  group: "Shadcn",
  ...registerChaiBlockSchema({
    properties: {
      itemStyles: stylesProp(""),
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
        _id: "a",
        _type: "Shadcn/Carousel",
        orientation: "horizontal",
        loop: false,
        showArrows: true,
        maxWidth: "max-w-sm",
      },
      {
        _id: "b",
        _type: "Shadcn/CarouselItem",
        _parent: "a",
      },
      {
        _id: "c",
        _type: "Box",
        _parent: "b",
        styles: {
          className: "aspect-square flex items-center justify-center p-6 bg-muted rounded-md",
        },
      },
      {
        _id: "d",
        _type: "Paragraph",
        _parent: "c",
        content: "Slide 1",
        styles: {
          className: "text-center text-lg font-medium",
        },
      },
      {
        _id: "e",
        _type: "Shadcn/CarouselItem",
        _parent: "a",
      },
      {
        _id: "f",
        _type: "Box",
        _parent: "e",
        styles: {
          className: "aspect-square flex items-center justify-center p-6 bg-muted rounded-md",
        },
      },
      {
        _id: "g",
        _type: "Paragraph",
        _parent: "f",
        content: "Slide 2",
        styles: {
          className: "text-center text-lg font-medium",
        },
      },
      {
        _id: "h",
        _type: "Shadcn/CarouselItem",
        _parent: "a",
      },
      {
        _id: "i",
        _type: "Box",
        _parent: "h",
        styles: {
          className: "aspect-square flex items-center justify-center p-6 bg-muted rounded-md",
        },
      },
      {
        _id: "j",
        _type: "Paragraph",
        _parent: "i",
        content: "Slide 3",
        styles: {
          className: "text-center text-lg font-medium",
        },
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      orientation: {
        type: "string",
        title: "Orientation",
        default: "horizontal",
        enum: ["horizontal", "vertical"],
      },
      loop: {
        type: "boolean",
        title: "Loop",
        default: false,
      },
      showArrows: {
        type: "boolean",
        title: "Show Navigation Arrows",
        default: true,
      },
      maxWidth: {
        type: "string",
        title: "Max Width",
        default: "max-w-xs",
        enum: ["max-w-xs", "max-w-sm", "max-w-md", "max-w-lg", "max-w-xl", "max-w-2xl", "max-w-4xl", "max-w-full"],
      },
    },
  }),
  canAcceptBlock: (type) => type === "Shadcn/CarouselItem",
});
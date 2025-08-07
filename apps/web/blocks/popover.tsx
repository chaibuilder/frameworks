import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";

const ShadcnPopover = (
  props: ChaiBlockComponentProps<{
    styles: ChaiStyles;
  }>
) => {
  return (
    <Popover {...props.blockProps} {...props.styles}>
      {props.children}
    </Popover>
  );
};

const ShadcnPopoverTrigger = (
  props: ChaiBlockComponentProps<{
    text: string;
    styles: ChaiStyles;
  }>
) => {
  return (
    <PopoverTrigger {...props.blockProps} {...props.styles} asChild={false}>
      {props.text}
    </PopoverTrigger>
  );
};

const ShadcnPopoverContent = (
  props: ChaiBlockComponentProps<{
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    styles: ChaiStyles;
  }>
) => {
  return (
    <PopoverContent 
      {...props.blockProps} 
      align={props.align}
      side={props.side}
      sideOffset={props.sideOffset}
      {...props.styles}
    >
      {props.children}
    </PopoverContent>
  );
};

registerChaiBlock(ShadcnPopoverTrigger, {
  type: "Shadcn/PopoverTrigger",
  label: "Popover Trigger",
  category: "core",
  group: "Shadcn",
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      text: {
        type: "string",
        title: "Text",
        default: "Open",
      },
    },
  }),
  i18nProps: ["text"],
  aiProps: ["text"],
  canAcceptBlock: () => false,
});

registerChaiBlock(ShadcnPopoverContent, {
  type: "Shadcn/PopoverContent",
  label: "Popover Content",
  category: "core",
  group: "Shadcn",
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      align: {
        type: "string",
        title: "Alignment",
        enum: ["start", "center", "end"],
        default: "center",
      },
      side: {
        type: "string",
        title: "Side",
        enum: ["top", "right", "bottom", "left"],
        default: "bottom",
      },
      sideOffset: {
        type: "number",
        title: "Side Offset",
        default: 4,
        minimum: 0,
        maximum: 50,
      },
    },
  }),
  canAcceptBlock: () => true,
});

registerChaiBlock(ShadcnPopover, {
  type: "Shadcn/Popover",
  label: "Popover",
  category: "core",
  group: "Shadcn",
  blocks() {
    return [
      {
        _id: "popover-root",
        _type: "Shadcn/Popover",
      },
      {
        _id: "popover-trigger",
        _type: "Shadcn/PopoverTrigger",
        text: "Open Popover",
        _parent: "popover-root",
      },
      {
        _id: "popover-content",
        _type: "Shadcn/PopoverContent",
        align: "center",
        side: "bottom",
        sideOffset: 4,
        _parent: "popover-root",
      },
      {
        _id: "popover-text",
        _type: "Paragraph",
        _parent: "popover-content",
        content: "Place your popover content here. You can add any blocks inside this popover.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
    },
  }),
  canAcceptBlock: (type) =>
    type === "Shadcn/PopoverTrigger" || type === "Shadcn/PopoverContent",
});

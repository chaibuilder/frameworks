import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "chai-next";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";
import * as React from "react";

const ShadcnPopover = (
  props: ChaiBlockComponentProps<{
    triggerText: string;
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    alignOffset?: number;
    buttonVariants:
      | "default"
      | "link"
      | "outline"
      | "destructive"
      | "secondary"
      | "ghost";
    buttonSize?: "default" | "sm" | "lg" | "icon";
    popoverStyles: ChaiStyles;
    triggerStyles: ChaiStyles;
    contentStyles: ChaiStyles;
  }>
) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} {...props.blockProps} {...props.popoverStyles}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            {...props.triggerStyles}
            variant={props.buttonVariants}
            size={props.buttonSize}
          >
            {props.triggerText}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={props.align}
          side={props.side}
          sideOffset={props.sideOffset}
          alignOffset={props.alignOffset}
          container={containerRef.current}
          {...props.contentStyles}
        >
          {props.children}
        </PopoverContent>
      </Popover>
    </div>
  );
};

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
        triggerText: "Open Popover",
        align: "center",
        side: "bottom",
        sideOffset: 4,
      },
      {
        _id: "popover-text",
        _type: "Paragraph",
        _parent: "popover-root",
        content:
          "Place your popover content here. You can add any blocks inside this popover.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      popoverStyles: stylesProp(""),
      triggerStyles: stylesProp(""),
      contentStyles: stylesProp(""),
      triggerText: {
        type: "string",
        title: "Button Text",
        default: "Open Popover",
      },
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
        default: 0,
        minimum: 0,
        maximum: 300,
      },
      alignOffset: {
        type: "number",
        title: "Align Offset",
        default: 0,
        minimum: 0,
        maximum: 300,
      },
      buttonVariants: {
        type: "string",
        title: "Button Variant",
        enum: [
          "default",
          "link",
          "outline",
          "destructive",
          "secondary",
          "ghost",
        ],
        default: "default",
      },
      buttonSize: {
        type: "string",
        title: "Button Size",
        enum: ["default", "sm", "lg", "icon"],
        default: "default",
      },
    },
  }),
  i18nProps: ["triggerText"],
  aiProps: ["triggerText"],
  canAcceptBlock: () => true,
});

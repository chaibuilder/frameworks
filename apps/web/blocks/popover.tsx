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
    triggerText: string;
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    itemStyles: ChaiStyles;
    triggerStyles: ChaiStyles;
    contentStyles: ChaiStyles;
  }>
) => {
  return (
    <div {...props.blockProps} {...props.itemStyles}>
      <Popover>
        <PopoverTrigger {...props.triggerStyles}>
          {props.triggerText}
        </PopoverTrigger>
        <PopoverContent
          align={props.align}
          side={props.side}
          sideOffset={props.sideOffset}
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
      itemStyles: stylesProp(""),
      triggerStyles: stylesProp(""),
      contentStyles: stylesProp(""),
      triggerText: {
        type: "string",
        title: "Trigger Text",
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
        default: 4,
        minimum: 0,
        maximum: 50,
      },
    },
  }),
  i18nProps: ["triggerText"],
  aiProps: ["triggerText"],
  canAcceptBlock: () => true,
});

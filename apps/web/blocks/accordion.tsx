import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "@chaibuilder/nextjs/blocks";

const ShadcnAccordion = (
  props: ChaiBlockComponentProps<{
    type: "single" | "multiple";
    styles: ChaiStyles;
  }>,
) => {
  return (
    <Accordion {...props.blockProps} type={props.type} collapsible {...props.styles}>
      {props.children}
    </Accordion>
  );
};

const ShadcnAccordionItem = (
  props: ChaiBlockComponentProps<{
    title: string;
    triggerStyles: ChaiStyles;
    contentStyles: ChaiStyles;
    itemStyles: ChaiStyles;
  }>,
) => {
  return (
    <AccordionItem {...props.blockProps} {...props.itemStyles} value={props.title}>
      <AccordionTrigger {...props.triggerStyles}>{props.title}</AccordionTrigger>
      <AccordionContent {...props.contentStyles}>{props.children}</AccordionContent>
    </AccordionItem>
  );
};

registerChaiBlock(ShadcnAccordionItem, {
  type: "Shadcn/AccordionItem",
  label: "Accordion Item",
  category: "core",
  group: "Shadcn",
  ...registerChaiBlockSchema({
    properties: {
      itemStyles: stylesProp(""),
      triggerStyles: stylesProp(""),
      contentStyles: stylesProp(""),
      title: {
        type: "string",
        title: "Title",
        default: "Title",
      },
    },
  }),
  i18nProps: ["title"],
  aiProps: ["title"],
  canAcceptBlock: () => true,
});

registerChaiBlock(ShadcnAccordion, {
  type: "Shadcn/Accordion",
  label: "Accordion",
  category: "core",
  group: "Shadcn",
  blocks() {
    return [
      {
        _id: "a",
        _type: "Shadcn/Accordion",
        type: "single",
      },
      {
        _id: "b",
        _type: "Shadcn/AccordionItem",
        title: "Title",
        _parent: "a",
      },
      {
        _id: "c",
        _type: "Paragraph",
        _parent: "b",
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      type: {
        type: "string",
        title: "Type",
        default: "single",
        enum: ["single", "multiple"],
      },
    },
  }),
  canAcceptBlock: (type) => type === "Shadcn/AccordionItem",
});

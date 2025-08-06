import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  registerChaiBlock,
  registerChaiBlockSchema,
} from "chai-next/blocks";

const ShadcnAccordion = (
  props: ChaiBlockComponentProps<{ type: "single" | "multiple" }>
) => {
  return (
    <Accordion {...props.blockProps} type={props.type} collapsible>
      {props.children}
    </Accordion>
  );
};

const ShadcnAccordionItem = (
  props: ChaiBlockComponentProps<{ title: string }>
) => {
  return (
    <AccordionItem {...props.blockProps} value={props.title}>
      <AccordionTrigger>{props.title}</AccordionTrigger>
      <AccordionContent>{props.children}</AccordionContent>
    </AccordionItem>
  );
};

registerChaiBlock(ShadcnAccordionItem, {
  type: "Shadcn/AccordionItem",
  label: "Accordion Item",
  category: "core",
  hidden: true,
  group: "Shadcn",
  ...registerChaiBlockSchema({
    properties: {
      title: {
        type: "string",
        title: "Title",
        default: "Title",
      },
    },
  }),
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
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      type: {
        type: "string",
        title: "Type",
        default: "single",
        enum: ["single", "multiple"],
      },
    },
  }),
});

"use client";

import { Badge } from "@/components/ui/badge";
import {
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";

const ShadcnBadge = (
  props: ChaiBlockComponentProps<{
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    styles: ChaiStyles;
  }>
) => {
  return (
    <Badge
      {...props.blockProps}
      variant={props.variant}
      {...props.styles}
    >
      {props.text}
    </Badge>
  );
};

registerChaiBlock(ShadcnBadge, {
  type: "Shadcn/Badge",
  label: "Badge",
  category: "core",
  group: "Shadcn",
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp(""),
      text: {
        type: "string",
        title: "Text",
        default: "Badge",
      },
      variant: {
        type: "string",
        title: "Variant",
        default: "default",
        enum: ["default", "secondary", "destructive", "outline"],
      },
    },
  }),
  i18nProps: ["text"],
  aiProps: ["text"],
});
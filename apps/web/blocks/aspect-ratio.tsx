import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "@chaibuilder/nextjs/blocks";

const ShadcnAspectRatio = (
  props: ChaiBlockComponentProps<{
    width?: number;
    height?: number;
    containerStyles: ChaiStyles;
  }>,
) => {
  const ratio =
    props.width && props.height && props.width > 0 && props.height > 0 ? props.width / props.height : 16 / 9;

  return (
    <div {...props.blockProps} {...props.containerStyles}>
      <AspectRatio ratio={ratio} asChild>
        {props.children}
      </AspectRatio>
    </div>
  );
};

registerChaiBlock(ShadcnAspectRatio, {
  type: "Shadcn/AspectRatio",
  label: "Aspect Ratio",
  category: "core",
  group: "Shadcn",
  blocks() {
    return [
      {
        _id: "aspect-ratio-root",
        _type: "Shadcn/AspectRatio",
        width: 2,
        height: 3,
      },
      {
        _id: "aspect-ratio-image",
        _type: "Image",
        _parent: "aspect-ratio-root",
        className: "Image",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      containerStyles: stylesProp(""),
      width: {
        type: "number",
        title: "Width",
        description: "Width value for aspect ratio calculation",
        default: 2,
        minimum: 1,
        maximum: 100,
        step: 1,
      },
      height: {
        type: "number",
        title: "Height",
        description: "Height value for aspect ratio calculation",
        default: 3,
        minimum: 1,
        maximum: 100,
        step: 1,
      },
    },
  }),
  canAcceptBlock: () => true,
});

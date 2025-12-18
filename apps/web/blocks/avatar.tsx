import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "@chaibuilder/nextjs/blocks";

const ShadcnAvatar = (
  props: ChaiBlockComponentProps<{
    image: string;
    alt: string;
    fallbackText: string;
    containerStyles: ChaiStyles;
    imageStyles: ChaiStyles;
    fallbackStyles: ChaiStyles;
  }>,
) => {
  return (
    <Avatar {...props.blockProps} {...props.containerStyles}>
      <AvatarImage src={props.image} alt={props.alt} {...props.imageStyles} />
      <AvatarFallback {...props.fallbackStyles}>{props.fallbackText}</AvatarFallback>
    </Avatar>
  );
};

registerChaiBlock(ShadcnAvatar, {
  type: "Shadcn/Avatar",
  label: "Avatar",
  category: "core",
  group: "Shadcn",
  blocks() {
    return [
      {
        _id: "avatar-root",
        _type: "Shadcn/Avatar",
        src: "https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=128&h=128&dpr=2&q=80",
        alt: "Avatar image",
        fallbackText: "CN",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      containerStyles: stylesProp(""),
      imageStyles: stylesProp(""),
      fallbackStyles: stylesProp(""),
      image: {
        type: "string",
        title: "Image",
        default: "https://fakeimg.pl/400x200?text=Choose&font=bebas",
        ui: { "ui:widget": "image" },
      },
      alt: {
        type: "string",
        title: "Alt Text",
        default: "Avatar image",
      },
      fallbackText: {
        type: "string",
        title: "Fallback Text",
        default: "CN",
        description: "Text to show when image fails to load",
      },
    },
  }),
  i18nProps: ["alt", "fallbackText"],
  aiProps: ["alt", "fallbackText"],
  canAcceptBlock: () => false,
});

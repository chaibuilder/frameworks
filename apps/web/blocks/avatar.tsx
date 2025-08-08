import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";

const ShadcnAvatar = (
  props: ChaiBlockComponentProps<{
    src: string;
    alt: string;
    fallbackText: string;
    containerStyles: ChaiStyles;
    imageStyles: ChaiStyles;
    fallbackStyles: ChaiStyles;
  }>
) => {
  return (
      <Avatar {...props.blockProps} {...props.containerStyles}>
        <AvatarImage 
          src={props.src} 
          alt={props.alt}
          {...props.imageStyles}
        />
        <AvatarFallback {...props.fallbackStyles}>
          {props.fallbackText}
        </AvatarFallback>
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
      src: {
        type: "string",
        title: "Image Source",
        default: "https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=128&h=128&dpr=2&q=80",
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

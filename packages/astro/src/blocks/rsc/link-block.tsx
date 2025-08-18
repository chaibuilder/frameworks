import { ChaiBlockComponentProps, ChaiStyles } from "@chaibuilder/pages/runtime";
import * as React from "react";
import ChaiBuilder from "../../server";

type LinkProps = {
  styles: ChaiStyles;
  content: string;
  link: {
    type: "page" | "pageType" | "url" | "email" | "telephone" | "element";
    target: "_self" | "_blank";
    href: string;
  };
  prefetchLink?: boolean;
};

const formatTelephoneLink = (href: string) => {
  return href.replace(/[^\d]/g, "");
};

export const LinkBlock = async (props: ChaiBlockComponentProps<LinkProps>) => {
  const { link, styles, children, content, prefetchLink, lang } = props;
  const isPageTypeLink = link?.type === "pageType" && link?.href !== "";
  let href = link?.type === "telephone" ? `tel:${formatTelephoneLink(link?.href)}` : link?.href;
  if (isPageTypeLink) {
    href = await ChaiBuilder.resolvePageLink(href, lang);
  }

  // Note: prefetchLink is not directly supported in standard anchor tags
  // You might want to implement prefetching using Intersection Observer or other methods

  if (children) {
    return (
      <a href={href || "#/"} target={link?.target} aria-label={content} {...styles}>
        {children}
      </a>
    );
  }

  return React.createElement(
    "a",
    {
      ...styles,
      href: href,
      target: link?.target || "_self",
      "aria-label": content,
    },
    content,
  );
};

export const LinkConfig = {
  type: "Link",
  label: "Link",
  group: "basic",
  schema: {
    properties: {
      link: {
        type: "object",
        title: "Link",
      },
      prefetchLink: {
        type: "boolean",
        default: false,
        title: "Prefetch Link",
      },
    },
  },
  i18nProps: ["content"],
};

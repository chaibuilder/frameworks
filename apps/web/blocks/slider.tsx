"use client";

import { SlickSlider } from "@/components/ui/slider";
import {
  ChaiBlock,
  ChaiBlockComponentProps,
  ChaiStyles,
  registerChaiBlock,
  registerChaiBlockSchema,
  stylesProp,
} from "chai-next/blocks";

// SliderItem component
const SliderItem = (
  props: ChaiBlockComponentProps<{
    styles: ChaiStyles;
  }>,
) => {
  return (
    <div {...props.blockProps} {...props.styles}>
      {props.children}
    </div>
  );
};

const ReactSlickSlider = (
  props: ChaiBlockComponentProps<{
    slides: number;
    autoplay: boolean;
    autoplaySpeed: number;
    dots: boolean;
    arrows: boolean;
    infinite: boolean;
    speed: number;
    slidesToShow: number;
    slidesToScroll: number;
    pauseOnHover: boolean;
    styles: ChaiStyles;
  }>,
) => {
  return (
    <SlickSlider
      {...props.blockProps}
      {...props.styles}
      dots={props.dots}
      arrows={props.arrows}
      infinite={props.infinite}
      speed={props.speed}
      slidesToShow={props.slidesToShow}
      slidesToScroll={props.slidesToScroll}
      autoplay={props.autoplay}
      autoplaySpeed={props.autoplaySpeed}
      pauseOnHover={props.pauseOnHover}>
      {props.children}
    </SlickSlider>
  );
};

//Register the main Slider component
registerChaiBlock(ReactSlickSlider, {
  type: "ReactSlick/Slider",
  label: "React Slick Slider",
  category: "core",
  group: "ReactSlick",
  blocks() {
    return [
      {
        _id: "slider-root",
        _type: "ReactSlick/Slider",
        slides: 3,
        autoplay: true,
        autoplaySpeed: 3000,
        dots: true,
        arrows: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        pauseOnHover: true,
      },
      {
        _id: "slider-item-1",
        _type: "ReactSlick/SliderItem",
        _parent: "slider-root",
      },
      {
        _id: "slide-1-content",
        _type: "Paragraph",
        _parent: "slider-item-1",
        content: "Slide 1 - Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      },
      {
        _id: "slider-item-2",
        _type: "ReactSlick/SliderItem",
        _parent: "slider-root",
      },
      {
        _id: "slide-2-content",
        _type: "Paragraph",
        _parent: "slider-item-2",
        content: "Slide 2 - Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      },
      {
        _id: "slider-item-3",
        _type: "ReactSlick/SliderItem",
        _parent: "slider-root",
      },
      {
        _id: "slide-3-content",
        _type: "Paragraph",
        _parent: "slider-item-3",
        content: "Slide 3 - Ut enim ad minim veniam, quis nostrud exercitation.",
      },
    ] as ChaiBlock[];
  },
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp("slider-container"),
      autoplay: {
        type: "boolean",
        title: "Autoplay",
        default: true,
      },
      autoplaySpeed: {
        type: "number",
        title: "Autoplay Speed (ms)",
        default: 3000,
        minimum: 1000,
        maximum: 10000,
        step: 500,
      },
      dots: {
        type: "boolean",
        title: "Show Dots",
        default: true,
      },
      arrows: {
        type: "boolean",
        title: "Show Arrows",
        default: true,
      },
      infinite: {
        type: "boolean",
        title: "Infinite Loop",
        default: true,
      },
      speed: {
        type: "number",
        title: "Transition Speed (ms)",
        default: 500,
        minimum: 100,
        maximum: 2000,
        step: 100,
      },
      slidesToShow: {
        type: "number",
        title: "Slides to Show",
        default: 1,
        minimum: 1,
        maximum: 1,
        step: 1,
      },
      slidesToScroll: {
        type: "number",
        title: "Slides to Scroll",
        default: 1,
        minimum: 1,
        maximum: 5,
        step: 1,
      },
      pauseOnHover: {
        type: "boolean",
        title: "Pause on Hover",
        default: true,
      },
    },
  }),
  canAcceptBlock: () => true,
});

// Register the SliderItem component
registerChaiBlock(SliderItem, {
  type: "ReactSlick/SliderItem",
  label: "Slider Item",
  category: "core",
  group: "ReactSlick",
  ...registerChaiBlockSchema({
    properties: {
      styles: stylesProp("slider-item"),
    },
  }),
  canAcceptBlock: () => true,
});

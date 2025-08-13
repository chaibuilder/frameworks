"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import Slider from "react-slick";

export interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  dots?: boolean;
  arrows?: boolean;
  infinite?: boolean;
  speed?: number;
  slidesToShow?: number;
  slidesToScroll?: number;
  autoplay?: boolean;
  autoplaySpeed?: number;
  pauseOnHover?: boolean;
  className?: string;
}

const SlickSlider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      dots = true,
      arrows = true,
      infinite = true,
      speed = 500,
      slidesToShow = 1,
      slidesToScroll = 1,
      autoplay = true,
      autoplaySpeed = 3000,
      pauseOnHover = true,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const settings = {
      dots,
      arrows,
      infinite,
      speed,
      slidesToShow,
      slidesToScroll,
      autoplay,
      autoplaySpeed,
      pauseOnHover,
    };

    return (
      <div ref={ref} {...props} className={cn("slider-container", className)}>
        <Slider {...settings}>
          {children}
        </Slider>
      </div>
    );
  },
);
SlickSlider.displayName = "SlickSlider";

export { SlickSlider };

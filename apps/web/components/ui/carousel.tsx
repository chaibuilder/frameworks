"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type CarouselApi = {
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selectedIndex: number;
  scrollTo: (index: number) => void;
};

type CarouselProps = {
  opts?: {
    align?: "start" | "center" | "end";
    loop?: boolean;
  };
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: React.RefObject<HTMLDivElement>;
  api: CarouselApi;
  opts: CarouselProps["opts"];
  orientation: NonNullable<CarouselProps["orientation"]>;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(true);
    const carouselRef = React.useRef<HTMLDivElement>(null);

    const scrollPrev = React.useCallback(() => {
      if (carouselRef.current) {
        const children = carouselRef.current.children;
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        
        const child = children[newIndex] as HTMLElement;
        if (child) {
          child.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: orientation === "horizontal" ? "start" : "nearest",
          });
        }
      }
    }, [selectedIndex, orientation]);

    const scrollNext = React.useCallback(() => {
      if (carouselRef.current) {
        const children = carouselRef.current.children;
        const newIndex = Math.min(children.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        
        const child = children[newIndex] as HTMLElement;
        if (child) {
          child.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: orientation === "horizontal" ? "start" : "nearest",
          });
        }
      }
    }, [selectedIndex, orientation]);

    const scrollTo = React.useCallback((index: number) => {
      if (carouselRef.current) {
        const children = carouselRef.current.children;
        const newIndex = Math.max(0, Math.min(children.length - 1, index));
        setSelectedIndex(newIndex);
        
        const child = children[newIndex] as HTMLElement;
        if (child) {
          child.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: orientation === "horizontal" ? "start" : "nearest",
          });
        }
      }
    }, [orientation]);

    const api = React.useMemo<CarouselApi>(
      () => ({
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        selectedIndex,
        scrollTo,
      }),
      [scrollPrev, scrollNext, canScrollPrev, canScrollNext, selectedIndex, scrollTo]
    );

    React.useEffect(() => {
      if (carouselRef.current) {
        const children = carouselRef.current.children;
        setCanScrollPrev(selectedIndex > 0);
        setCanScrollNext(selectedIndex < children.length - 1);
      }
    }, [selectedIndex]);

    React.useEffect(() => {
      setApi?.(api);
    }, [api, setApi]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api,
          opts,
          orientation,
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className={cn(
        "flex",
        orientation === "horizontal"
          ? "-ml-4 overflow-x-auto scrollbar-hide"
          : "-mt-4 flex-col overflow-y-auto scrollbar-hide",
        className
      )}
      {...props}
    />
  );
});
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel();

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <button
      ref={ref}
      className={cn(
        "absolute h-8 w-8 rounded-full border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <button
      ref={ref}
      className={cn(
        "absolute h-8 w-8 rounded-full border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </button>
  );
});
CarouselNext.displayName = "CarouselNext";

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
};
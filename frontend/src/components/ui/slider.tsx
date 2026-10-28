"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/** Thumb width in px: radix keeps the thumb inside the track, so overlays must use the same offset. */
export const SLIDER_THUMB_PX = 24;

/** `left` for something that should line up with the thumb at `percent` (0-100). */
export const thumbLeft = (percent: number): string =>
  `calc(${percent}% + ${SLIDER_THUMB_PX / 2 - (percent * SLIDER_THUMB_PX) / 100}px)`;

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  thumbLabel?: string;
  thumbValueText?: string;
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, children, thumbLabel, thumbValueText, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex h-11 w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {children}
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        aria-valuetext={thumbValueText}
        // The ::after makes the touch target 44px while the visible thumb stays 24px.
        className="relative block h-6 w-6 rounded-full border-2 border-primary bg-background shadow transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

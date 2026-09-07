import * as React from "react";

import { cn } from "@/lib/utils";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.ComponentProps<"input"> {
  labelRight?: string;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      labelRight,
      fullWidth,
      ...props
    },
    ref
  ) => {
    return (
      <div className={twMerge("relative", fullWidth ? "w-full" : "")}>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input/08 bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            labelRight && "pr-12",
            className
          )}
          ref={ref}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[14px]">
          {labelRight && labelRight}
        </span>
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

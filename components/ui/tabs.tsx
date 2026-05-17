"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-1 [-ms-overflow-style:none] [scrollbar-width:none] md:inline-flex md:w-auto [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 min-h-11 touch-manipulation items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap text-slate-400 outline-none transition-colors sm:min-h-10",
        "hover:bg-white/[0.06] hover:text-slate-200",
        "aria-selected:bg-white/[0.1] aria-selected:text-white aria-selected:shadow-[0_0_12px_rgba(56,189,248,0.12)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("min-h-[320px] flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };

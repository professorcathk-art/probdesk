"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <Menu.Root>{children}</Menu.Root>;
}

export function DropdownMenuTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Trigger>) {
  return <Menu.Trigger type="button" className={cn("outline-none", className)} {...props} />;
}

export function DropdownMenuContent({
  children,
  align = "end",
  side = "bottom",
  sideOffset = 8,
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right" | "inline-end" | "inline-start";
  sideOffset?: number;
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("z-[500] outline-none")}
      >
        <Menu.Popup
          className={cn(
            "z-[500] min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-xl outline-none",
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-pointer select-none px-3 py-2 text-sm text-slate-800 outline-none data-highlighted:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-slate-200" />;
}

export function DropdownMenuLinkItem({
  className,
  closeOnClick = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.LinkItem>) {
  return (
    <Menu.LinkItem
      closeOnClick={closeOnClick}
      className={cn(
        "flex cursor-pointer select-none px-3 py-2 text-sm text-slate-800 no-underline outline-none data-highlighted:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}

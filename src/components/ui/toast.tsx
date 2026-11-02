"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ICON_STROKE, OVERLAY_THEME_CLASS } from "@/lib/design-system";
import {
  CheckIcon,
  CircleAlertIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";

/**
 * The app's toast manager. Call `toast.add({ type, title })` from anywhere on
 * the client; `type` is `"success"` or `"error"`, and picks the icon and colour.
 */
const toast = ToastPrimitive.createToastManager();

/** Holds the toasts of a manager and their timers. */
function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

/** Renders the viewport into the document body. */
function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

/** Fixed stack in the bottom corner, in line with the page gutter. */
function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-60 mx-auto w-auto max-w-sm outline-none sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0 sm:w-full",
        className,
      )}
      {...props}
    />
  );
}

/** One toast, on the same surface as a popover. Stacks and swipes away. */
function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 will-change-transform outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms] motion-reduce:[transition:none]",
        "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className,
      )}
      {...props}
    />
  );
}

/** Lays out a toast's icon, text and actions. */
function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-2 overflow-hidden py-2 pr-2 pl-3 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A toast's sentence. A long name wraps rather than truncates, because the words
 * after it carry the news; an error's sentence is `destructive`.
 */
function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(
        "text-sm font-medium wrap-anywhere group-data-[type=error]/toast:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

/** Optional supporting line under a toast's title. */
function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        "type-caption wrap-anywhere text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Optional action button; renders nothing unless the toast has one. */
function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

/** Dismisses the toast. */
function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      render={render}
      className={cn(
        "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon strokeWidth={ICON_STROKE} aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

/**
 * The icon of a toast type, matching `StatusLine`: a `brand` tick for success
 * and a `destructive` alert for an error.
 *
 * @param props.type The toast's type.
 * @returns The icon, or nothing for an untyped toast.
 */
function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = (
      <CheckIcon
        className="text-brand"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    );
  }

  if (type === "info") {
    icon = (
      <InfoIcon
        className="text-muted-foreground"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    );
  }

  if (type === "warning") {
    icon = (
      <TriangleAlertIcon
        className="text-muted-foreground"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    );
  }

  if (type === "error") {
    icon = (
      <CircleAlertIcon
        className="text-destructive"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    );
  }

  if (type === "loading") {
    icon = <Spinner className="text-muted-foreground" />;
  }

  if (!icon) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
    >
      {icon}
    </span>
  );
}

/** Renders the manager's current toasts. */
function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

/**
 * The app's toast container. Mount it once in the root layout and trigger toasts
 * with {@link toast}. Its portal sits outside any view's `nutria-theme` subtree,
 * so the viewport opts into the design-system palette itself.
 *
 * @param props Base UI provider props, such as `timeout` or `limit`.
 * @returns The provider and the portaled toast stack.
 */
function Toaster({
  children,
  toastManager = toast,
  ...props
}: ToastPrimitive.Provider.Props) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport className={OVERLAY_THEME_CLASS}>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

/** Creates a separate toast manager, for tests or isolated stacks. */
const createToastManager = ToastPrimitive.createToastManager;
/** Reads the toasts of the nearest provider. */
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};

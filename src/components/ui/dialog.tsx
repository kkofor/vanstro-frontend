"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  forwardRef,
  useCallback,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "./cn";

export interface DialogRootProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

export function DialogRoot({ modal = true, ...props }: DialogRootProps) {
  return <DialogPrimitive.Root modal={modal} {...props} />;
}

export interface DialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild = false, ...props }, ref) => (
    <DialogPrimitive.Trigger
      {...props}
      ref={ref}
      data-slot="dialog-trigger"
      asChild={asChild}
    />
  ),
);
DialogTrigger.displayName = "DialogTrigger";

export interface DialogPortalProps {
  children?: ReactNode;
  container?: HTMLElement | null;
  forceMount?: true;
}

export function DialogPortal(props: DialogPortalProps) {
  return <DialogPrimitive.Portal {...props} />;
}

export interface DialogOverlayProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: true;
}

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      {...props}
      ref={ref}
      data-slot="dialog-overlay"
      className={cn("vs-ui-dialog-overlay fixed inset-0 z-50", className)}
    />
  ),
);
DialogOverlay.displayName = "DialogOverlay";

export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Keep false unless dismissing by clicking outside is safe for the current task. */
  dismissOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  showCloseLabel?: boolean;
  closeLabel?: string;
  forceMount?: true;
  portalContainer?: HTMLElement | null;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      children,
      className,
      dismissOnOverlayClick = false,
      showCloseButton = true,
      showCloseLabel = false,
      closeLabel = "关闭对话框",
      forceMount,
      portalContainer,
      ...props
    },
    ref,
  ) => (
    <DialogPortal container={portalContainer} forceMount={forceMount}>
      <DialogOverlay forceMount={forceMount} />
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        data-slot="dialog-content"
        className={cn(
          "vs-ui-dialog-content fixed left-1/2 top-1/2 z-50 grid w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 gap-4 border p-6 outline-none",
          className,
        )}
        onPointerDownOutside={(event) => {
          if (!dismissOnOverlayClick) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          event.stopPropagation();
          props.onEscapeKeyDown?.(event);
        }}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-content-close"
            className="vs-ui-dialog-close absolute right-4 top-4 inline-flex min-h-9 min-w-9 items-center justify-center px-2"
            aria-label={closeLabel}
          >
            <span aria-hidden="true">×</span>
            <span className={showCloseLabel ? "ml-1" : "sr-only"}>{closeLabel}</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = "DialogContent";

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      data-slot="dialog-header"
      className={cn("vs-ui-dialog-header flex flex-col gap-2 pr-8", className)}
    />
  ),
);
DialogHeader.displayName = "DialogHeader";

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      data-slot="dialog-footer"
      className={cn(
        "vs-ui-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
    />
  ),
);
DialogFooter.displayName = "DialogFooter";

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      {...props}
      ref={ref}
      data-slot="dialog-title"
      className={cn("vs-ui-dialog-title", className)}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      {...props}
      ref={ref}
      data-slot="dialog-description"
      className={cn("vs-ui-dialog-description", className)}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";

export interface DialogCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ asChild = false, ...props }, ref) => (
    <DialogPrimitive.Close
      {...props}
      ref={ref}
      data-slot="dialog-close"
      asChild={asChild}
    />
  ),
);
DialogClose.displayName = "DialogClose";

export interface ConfirmDialogProps {
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  closeLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  dismissOnOverlayClick?: boolean;
  errorMessage?: ReactNode | ((error: unknown) => ReactNode);
  onConfirmError?: (error: unknown) => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  closeLabel = "关闭确认对话框",
  destructive = false,
  loading = false,
  loadingLabel = "处理中…",
  disabled = false,
  dismissOnOverlayClick = false,
  errorMessage = "操作失败，请重试。",
  onConfirmError,
  onConfirm,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<unknown>();
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const isBusy = loading || pending;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isBusy && !nextOpen) return;
      if (nextOpen) setConfirmError(undefined);
      setOpen(nextOpen);
    },
    [isBusy, setOpen],
  );

  const handleConfirm = useCallback(async () => {
    if (disabled || isBusy) return;

    setConfirmError(undefined);
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      setConfirmError(error);
      onConfirmError?.(error);
    } finally {
      setPending(false);
    }
  }, [disabled, isBusy, onConfirm, onConfirmError, setOpen]);

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <div data-slot="confirm-dialog">
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent closeLabel={closeLabel} dismissOnOverlayClick={dismissOnOverlayClick}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {confirmError !== undefined ? (
            <div data-slot="confirm-dialog-error" role="alert" className="vs-ui-dialog-description">
              {typeof errorMessage === "function" ? errorMessage(confirmError) : errorMessage}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose
              className="vs-ui-dialog-action inline-flex min-h-10 items-center justify-center px-4"
              disabled={isBusy}
            >
              {cancelLabel}
            </DialogClose>
            <button
              data-slot="confirm-dialog-confirm"
              type="button"
              className={cn(
                "vs-ui-dialog-action inline-flex min-h-10 items-center justify-center px-4",
                destructive ? "vs-ui-dialog-action-destructive" : undefined,
              )}
              disabled={disabled || isBusy}
              aria-busy={isBusy || undefined}
              onClick={() => void handleConfirm()}
            >
              {isBusy ? loadingLabel : confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </div>
    </DialogRoot>
  );
}

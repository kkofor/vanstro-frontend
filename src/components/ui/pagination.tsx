import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";

function classes(base: string, className?: string) {
  return className ? `${base} ${className}` : base;
}

export interface PaginationProps
  extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  pageLabel?: string;
}

export const Pagination = forwardRef<ComponentRef<"nav">, PaginationProps>(
  (
    {
      page,
      totalPages,
      onPageChange,
      previousLabel = "上一页",
      nextLabel = "下一页",
      pageLabel,
      "aria-label": ariaLabel = "分页导航",
      className,
      ...props
    },
    ref,
  ) => {
    const previousDisabled = page <= 1;
    const nextDisabled = page >= totalPages;

    return (
      <nav
        {...props}
        aria-label={ariaLabel}
        className={classes(
          "vs-ui-pagination flex w-full items-center justify-between gap-3",
          className,
        )}
        data-slot="pagination"
        ref={ref}
      >
        <span
          aria-current="page"
          className="vs-ui-pagination-status shrink-0"
          data-slot="pagination-status"
        >
          {pageLabel ?? `第 ${page} 页，共 ${totalPages} 页`}
        </span>
        <div
          className="vs-ui-pagination-actions flex items-center gap-2"
          data-slot="pagination-actions"
        >
          <button
            aria-label={previousLabel}
            className="vs-ui-pagination-button inline-flex h-8 min-w-8 items-center justify-center px-3"
            data-slot="pagination-previous"
            disabled={previousDisabled}
            onClick={() => {
              if (!previousDisabled) onPageChange(page - 1);
            }}
            type="button"
          >
            {previousLabel}
          </button>
          <button
            aria-label={nextLabel}
            className="vs-ui-pagination-button inline-flex h-8 min-w-8 items-center justify-center px-3"
            data-slot="pagination-next"
            disabled={nextDisabled}
            onClick={() => {
              if (!nextDisabled) onPageChange(page + 1);
            }}
            type="button"
          >
            {nextLabel}
          </button>
        </div>
      </nav>
    );
  },
);
Pagination.displayName = "Pagination";

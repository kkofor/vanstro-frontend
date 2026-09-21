import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";

function classes(base: string, className?: string) {
  return className ? `${base} ${className}` : base;
}

export interface TableProps
  extends Omit<ComponentPropsWithoutRef<"table">, "aria-label"> {
  "aria-label": string;
  containerClassName?: string;
}

export const Table = forwardRef<ComponentRef<"table">, TableProps>(
  ({ "aria-label": ariaLabel, className, containerClassName, ...props }, ref) => (
    <div
      aria-label={ariaLabel}
      className={classes(
        "vs-ui-table-region relative w-full overflow-x-auto",
        containerClassName,
      )}
      data-slot="table-region"
      role="region"
      tabIndex={0}
    >
      <table
        {...props}
        className={classes(
          "vs-ui-table w-full caption-bottom border-collapse",
          className,
        )}
        data-slot="table"
        ref={ref}
      />
    </div>
  ),
);
Table.displayName = "Table";

export type TableHeaderProps = ComponentPropsWithoutRef<"thead">;

export const TableHeader = forwardRef<ComponentRef<"thead">, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      {...props}
      className={classes("vs-ui-table-header", className)}
      data-slot="table-header"
      ref={ref}
    />
  ),
);
TableHeader.displayName = "TableHeader";

export type TableBodyProps = ComponentPropsWithoutRef<"tbody">;

export const TableBody = forwardRef<ComponentRef<"tbody">, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      {...props}
      className={classes("vs-ui-table-body", className)}
      data-slot="table-body"
      ref={ref}
    />
  ),
);
TableBody.displayName = "TableBody";

export type TableFooterProps = ComponentPropsWithoutRef<"tfoot">;

export const TableFooter = forwardRef<ComponentRef<"tfoot">, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      {...props}
      className={classes("vs-ui-table-footer", className)}
      data-slot="table-footer"
      ref={ref}
    />
  ),
);
TableFooter.displayName = "TableFooter";

export type TableRowProps = ComponentPropsWithoutRef<"tr">;

export const TableRow = forwardRef<ComponentRef<"tr">, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      {...props}
      className={classes("vs-ui-table-row", className)}
      data-slot="table-row"
      ref={ref}
    />
  ),
);
TableRow.displayName = "TableRow";

export type TableHeadProps = ComponentPropsWithoutRef<"th">;

export const TableHead = forwardRef<ComponentRef<"th">, TableHeadProps>(
  ({ className, scope = "col", ...props }, ref) => (
    <th
      {...props}
      className={classes(
        "vs-ui-table-head h-10 whitespace-nowrap px-3 text-left align-middle",
        className,
      )}
      data-slot="table-head"
      ref={ref}
      scope={scope}
    />
  ),
);
TableHead.displayName = "TableHead";

export type TableCellProps = ComponentPropsWithoutRef<"td">;

export const TableCell = forwardRef<ComponentRef<"td">, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      {...props}
      className={classes(
        "vs-ui-table-cell px-3 py-2 align-middle",
        className,
      )}
      data-slot="table-cell"
      ref={ref}
    />
  ),
);
TableCell.displayName = "TableCell";

export type TableCaptionProps = ComponentPropsWithoutRef<"caption">;

export const TableCaption = forwardRef<
  ComponentRef<"caption">,
  TableCaptionProps
>(({ className, ...props }, ref) => (
  <caption
    {...props}
    className={classes("vs-ui-table-caption mt-3", className)}
    data-slot="table-caption"
    ref={ref}
  />
));
TableCaption.displayName = "TableCaption";

export interface TableEmptyProps extends ComponentPropsWithoutRef<"td"> {
  colSpan: number;
}

export const TableEmpty = forwardRef<ComponentRef<"td">, TableEmptyProps>(
  ({ className, children = "暂无数据", ...props }, ref) => (
    <tr className="vs-ui-table-row" data-slot="table-empty-row">
      <td
        {...props}
        className={classes(
          "vs-ui-table-empty h-24 px-3 text-center align-middle",
          className,
        )}
        data-slot="table-empty"
        ref={ref}
      >
        {children}
      </td>
    </tr>
  ),
);
TableEmpty.displayName = "TableEmpty";

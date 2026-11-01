import type { ReactNode } from "react";

import {
  ArrowDown,
  ArrowUp,
  EllipsisVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "cn";

import { MacroDot, type MacroName } from "@/components/segmented-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableHead } from "@/components/ui/table";
import { ICON_STROKE, OVERLAY_THEME_CLASS } from "@/lib/design-system";
import type { LibrarySort } from "@/lib/library";

/** A column heading: quiet, and aligned with its numbers. */
export const LIBRARY_HEAD_CLASS =
  "text-muted-foreground h-8 px-1 text-right text-xs font-normal sm:px-2";

/** A number cell, right-aligned so the digits line up. */
export const LIBRARY_NUMBER_CELL_CLASS = "px-1 text-right sm:px-2";

/** A row action: muted until hovered. */
const ROW_ACTION_CLASS = "text-muted-foreground";

/**
 * A table heading that sorts by its column, and tells assistive technology how
 * the column is sorted. The arrow shows the direction of the active sort.
 *
 * @typeParam K The columns the table can sort by.
 * @param props.column The column this heading sorts.
 * @param props.sort The current sort.
 * @param props.onSort Called with the column when the heading is clicked.
 * @param props.className Classes for the heading cell.
 * @param props.children The heading's label.
 * @returns The heading cell; never throws.
 */
export function SortableHead<K extends string>({
  column,
  sort,
  onSort,
  className,
  children,
}: {
  column: K;
  sort: LibrarySort<K>;
  onSort: (column: K) => void;
  className?: string;
  children: ReactNode;
}) {
  const direction = sort?.key === column ? sort.direction : null;
  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      role="columnheader"
      className={cn(LIBRARY_HEAD_CLASS, className)}
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : undefined
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={cn(
          "-mx-1 gap-0.5 px-1 font-normal",
          direction && "text-foreground",
        )}
        onClick={() => onSort(column)}
      >
        {children}
        {direction ? (
          <Arrow
            data-icon="inline-end"
            aria-hidden="true"
            strokeWidth={ICON_STROKE}
          />
        ) : null}
      </Button>
    </TableHead>
  );
}

/**
 * What a macro column's heading says: its dot and initial, with the full name
 * for assistive technology.
 *
 * @param props.macro The macro the column shows.
 * @param props.label The macro's name.
 * @returns The heading's label; never throws.
 */
export function MacroHeadLabel({
  macro,
  label,
}: {
  macro: MacroName;
  label: string;
}) {
  return (
    <>
      <MacroDot macro={macro} />
      <span aria-hidden="true" className="ml-0.5">
        {label[0]}
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}

/**
 * An outline Add action with the brand plus.
 *
 * @param props.onClick Called when the button is clicked.
 * @param props.children The button's label.
 * @returns The button; never throws.
 */
export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" variant="outline" onClick={onClick}>
      <Plus
        data-icon="inline-start"
        strokeWidth={ICON_STROKE}
        className="text-brand"
      />
      {children}
    </Button>
  );
}

/**
 * A library row's name. Phones get a second line, because `title` has no hover
 * to reveal the rest of the name there.
 *
 * @param props.name The name to show.
 * @returns The name; never throws.
 */
export function LibraryRowName({ name }: { name: string }) {
  return (
    <div className="line-clamp-2 wrap-anywhere sm:line-clamp-1" title={name}>
      {name}
    </div>
  );
}

/**
 * A library row's edit and delete actions, folded into one menu on phones so the
 * name keeps its room.
 *
 * @param props.name The row's name, for the buttons' labels.
 * @param props.onEdit Called when edit is chosen.
 * @param props.onDelete Called when delete is chosen.
 * @returns Both forms of the actions; never throws.
 */
export function LibraryRowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="hidden justify-end gap-1 sm:flex">
        <Button
          variant="ghost"
          size="icon"
          className={ROW_ACTION_CLASS}
          aria-label={`Edit ${name}`}
          onClick={onEdit}
        >
          <Pencil strokeWidth={ICON_STROKE} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={ROW_ACTION_CLASS}
          aria-label={`Delete ${name}`}
          onClick={onDelete}
        >
          <Trash2 strokeWidth={ICON_STROKE} />
        </Button>
      </div>

      <div className="flex justify-end sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={ROW_ACTION_CLASS}
                aria-label={`Actions for ${name}`}
              />
            }
          >
            <EllipsisVertical strokeWidth={ICON_STROKE} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={OVERLAY_THEME_CLASS}>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil strokeWidth={ICON_STROKE} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 strokeWidth={ICON_STROKE} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

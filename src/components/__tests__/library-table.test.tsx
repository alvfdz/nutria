import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import {
  AddButton,
  LibraryRowActions,
  LibraryRowName,
  MacroHeadLabel,
  SortableHead,
} from "@/components/library-table";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import type { LibrarySort } from "@/lib/library";

/** Renders a heading for the `fat` column under the given sort. */
function renderHead(sort: LibrarySort<"name" | "fat">, onSort = vi.fn()) {
  render(
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead column="fat" sort={sort} onSort={onSort}>
            Fat
          </SortableHead>
        </TableRow>
      </TableHeader>
    </Table>,
  );

  return onSort;
}

describe("SortableHead", () => {
  test("reports its column when clicked", async () => {
    const user = userEvent.setup();
    const onSort = renderHead(null);

    await user.click(screen.getByRole("button", { name: "Fat" }));

    expect(onSort).toHaveBeenCalledWith("fat");
  });

  test("states no direction while another column is sorted", () => {
    renderHead({ key: "name", direction: "asc" });

    expect(screen.getByRole("columnheader")).not.toHaveAttribute("aria-sort");
  });

  test.each([
    ["asc", "ascending"],
    ["desc", "descending"],
  ] as const)("states the %s direction", (direction, expected) => {
    renderHead({ key: "fat", direction });

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      expected,
    );
  });
});

describe("MacroHeadLabel", () => {
  test("shows the initial and names the macro for assistive technology", () => {
    render(
      <button>
        <MacroHeadLabel macro="protein" label="Protein" />
      </button>,
    );

    expect(screen.getByRole("button", { name: "Protein" })).toHaveTextContent(
      /^PProtein$/,
    );
  });
});

describe("AddButton", () => {
  test("marks the action with the brand plus and reports clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AddButton onClick={onClick}>New meal</AddButton>);

    const button = screen.getByRole("button", { name: "New meal" });
    expect(button.querySelector("svg")).toHaveClass("text-brand");

    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("LibraryRowName", () => {
  test("clips a long name and keeps it in the title", () => {
    const name = "a".repeat(60);
    render(<LibraryRowName name={name} />);

    const element = screen.getByText(name);
    expect(element).toHaveClass("line-clamp-2", "sm:line-clamp-1");
    expect(element).toHaveAttribute("title", name);
  });
});

describe("LibraryRowActions", () => {
  test("labels each action with the row's name and reports it", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <LibraryRowActions name="Soup" onEdit={onEdit} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Soup" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete Soup" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test("folds the same actions into one menu for phones", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <LibraryRowActions name="Soup" onEdit={vi.fn()} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Actions for Soup" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledOnce();
  });
});

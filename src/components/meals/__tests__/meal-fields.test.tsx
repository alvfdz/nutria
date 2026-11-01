import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { MealFields } from "@/components/meals/meal-fields";
import { THIN_SPACE } from "@/lib/design-system";
import type { MealFieldErrors } from "@/lib/meals/form-state";
import type { Meal } from "@/lib/meals/types";
import { makeIngredient } from "@test/factories";

const ingredients = [
  makeIngredient({ id: "ing-oats", name: "Oats" }),
  makeIngredient({ id: "ing-milk", name: "Milk" }),
  makeIngredient({ id: "ing-whey", name: "Whey Protein" }),
];

/** The live preview's four values, in builder order, as rendered text. */
const definitions = () =>
  screen.getAllByRole("definition").map((node) => node.textContent);

/** The preview's values, with the thin space the design system puts before a unit. */
const preview = (kcal: string, protein: string, carbs: string, fat: string) => [
  `${kcal}${THIN_SPACE}kcal`,
  `${protein}${THIN_SPACE}g`,
  `${carbs}${THIN_SPACE}g`,
  `${fat}${THIN_SPACE}g`,
];

describe("MealFields", () => {
  test("starts with one empty row", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(screen.getByLabelText("Ingredient 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  test("picks an ingredient from the list", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));

    expect(screen.getByRole("combobox", { name: "Ingredient 1" })).toHaveValue(
      "Oats",
    );
  });

  test("lists every ingredient as an option", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    const listbox = await screen.findByRole("listbox");

    for (const ingredient of ingredients) {
      expect(
        within(listbox).getByRole("option", { name: ingredient.name }),
      ).toBeInTheDocument();
    }
  });

  test("adds a row and keeps the previous row's values", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.type(screen.getByLabelText("Grams 1"), "250");
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    expect(screen.getByLabelText("Ingredient 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toHaveValue(250);
    expect(screen.getByLabelText("Grams 2")).toHaveValue(null);
  });

  test("removes a row and renumbers the rest", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    expect(screen.getByLabelText("Ingredient 2")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );

    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toBeInTheDocument();
  });

  test("seeds the rows and the name from an existing meal", () => {
    const meal: Meal = {
      id: "meal-1",
      name: "Porridge",
      createdAt: "2026-01-01T00:00:00.000Z",
      items: [
        {
          id: "meal-item-1",
          sortOrder: 0,
          ingredientId: "ing-oats",
          grams: 80,
          ingredient: ingredients[0],
        },
        {
          id: "meal-item-2",
          sortOrder: 1,
          ingredientId: "ing-milk",
          grams: 250,
          ingredient: ingredients[1],
        },
      ],
    };

    render(
      <MealFields meal={meal} ingredients={ingredients} fieldErrors={{}} />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Porridge");
    expect(screen.getByRole("combobox", { name: "Ingredient 1" })).toHaveValue(
      "Oats",
    );
    expect(screen.getByLabelText("Grams 1")).toHaveValue(80);
    expect(screen.getByRole("combobox", { name: "Ingredient 2" })).toHaveValue(
      "Milk",
    );
    expect(screen.getByLabelText("Grams 2")).toHaveValue(250);
  });

  test("renders field errors next to the offending field", () => {
    render(
      <MealFields
        ingredients={ingredients}
        fieldErrors={{
          name: ["Name is required."],
          "items.0.ingredientId": ["Pick an ingredient."],
          "items.0.grams": ["Grams must be at least 1."],
          items: ["Each row needs grams."],
        }}
      />,
    );

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Pick an ingredient.")).toBeInTheDocument();
    expect(screen.getByText("Grams must be at least 1.")).toBeInTheDocument();
    expect(screen.getByText("Each row needs grams.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Grams 1")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("submits one hidden ingredientId and grams pair per row", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <MealFields ingredients={ingredients} fieldErrors={{}} />
      </form>,
    );
    const form = container.querySelector("form")!;

    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await user.type(screen.getByLabelText("Grams 1"), "80");
    await user.type(screen.getByLabelText("Grams 2"), "250");

    const data = new FormData(form as HTMLFormElement);

    expect(data.getAll("ingredientId")).toHaveLength(2);
    expect(data.getAll("grams")).toEqual(["80", "250"]);
    expect(data.get("name")).toBe("");
  });

  test("previews zeroes before anything is entered", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(definitions()).toEqual(preview("0", "0", "0", "0"));
  });

  test("previews the totals of the rows entered so far", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));
    await user.type(screen.getByLabelText("Grams 1"), "200");

    // Oats carries the factory's 165 kcal / 31.5 p / 0 c / 3.6 f per 100 g.
    expect(definitions()).toEqual(preview("330", "63", "0", "7.2"));
  });

  test("ignores rows missing an ingredient or a quantity", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.type(screen.getByLabelText("Grams 1"), "200");
    expect(definitions()).toEqual(preview("0", "0", "0", "0"));

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));
    await user.clear(screen.getByLabelText("Grams 1"));

    expect(definitions()).toEqual(preview("0", "0", "0", "0"));
  });

  test("divides the preview's bar by the rows entered so far", async () => {
    const user = userEvent.setup();
    render(
      <MealFields
        ingredients={[
          makeIngredient({
            id: "ing-half",
            name: "Half",
            proteinPer100g: 9,
            carbsPer100g: 0,
            fatPer100g: 4,
          }),
        ]}
        fieldErrors={{}}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Half" }));
    await user.type(screen.getByLabelText("Grams 1"), "100");

    const segments = document.querySelectorAll<HTMLElement>(
      '[data-slot="macro-bar-segment"]',
    );
    expect([...segments].map((segment) => segment.style.width)).toEqual([
      "50%",
      "0%",
      "50%",
    ]);
  });

  test("keeps an empty bar in the preview before anything is entered", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(
      document.querySelector('[data-slot="macro-bar-remainder"]'),
    ).toBeInTheDocument();
  });

  test("ties a row's errors to its inputs", () => {
    render(
      <MealFields
        ingredients={ingredients}
        fieldErrors={{
          "items.0.ingredientId": ["Pick an ingredient."],
          "items.0.grams": ["Grams must be at least 1."],
        }}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveAccessibleDescription("Pick an ingredient.");
    expect(screen.getByLabelText("Grams 1")).toHaveAccessibleDescription(
      "Grams must be at least 1.",
    );
  });

  test("marks the add action with the brand plus", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(
      screen
        .getByRole("button", { name: "Add ingredient" })
        .querySelector("svg"),
    ).toHaveClass("text-brand");
  });

  test("names the chosen ingredient in the trigger's title", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    const trigger = screen.getByRole("combobox", { name: "Ingredient 1" });
    expect(trigger).not.toHaveAttribute("title");

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Oats" }));

    expect(trigger).toHaveAttribute("title", "Oats");
  });

  test("shows a gram unit inside each quantity field", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    const grams = screen.getByLabelText("Grams 1");
    expect(within(grams.parentElement!).getByText("g")).toBeInTheDocument();
  });

  test("drops the hidden inputs of a removed row", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <MealFields ingredients={ingredients} fieldErrors={{}} />
      </form>,
    );
    const form = container.querySelector("form")!;

    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );

    const data = new FormData(form as HTMLFormElement);

    expect(data.getAll("ingredientId")).toHaveLength(1);
    expect(data.getAll("grams")).toHaveLength(1);
  });

  test("narrows the list to what is typed, ignoring case and accents", async () => {
    const user = userEvent.setup();
    render(
      <MealFields
        ingredients={[
          makeIngredient({ id: "ing-ham", name: "Jamón" }),
          ...ingredients,
        ]}
        fieldErrors={{}}
      />,
    );

    await user.type(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
      "JAMON",
    );

    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Jamón"]);
  });

  test("says so when nothing matches what is typed", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.type(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
      "tofu",
    );

    expect(
      await screen.findByText("No matching ingredient"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  test("picks the top match with the keyboard", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    const picker = screen.getByRole("combobox", { name: "Ingredient 1" });
    await user.type(picker, "whey");
    await screen.findByRole("option", { name: "Whey Protein" });
    await user.keyboard("{Enter}");

    expect(picker).toHaveValue("Whey Protein");
  });

  test("submits the chosen ingredient's id", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <MealFields ingredients={ingredients} fieldErrors={{}} />
      </form>,
    );

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Milk" }));

    const data = new FormData(container.querySelector("form")!);
    expect(data.getAll("ingredientId")).toEqual(["ing-milk"]);
  });

  test("names the picker's chevron", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(
      screen.getByRole("button", { name: "Show ingredients for row 1" }),
    ).toBeInTheDocument();
  });

  describe("removing rows", () => {
    test("names the chosen ingredient on the remove button", async () => {
      const user = userEvent.setup();
      render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

      await user.click(screen.getByRole("button", { name: "Add ingredient" }));
      await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
      await user.click(await screen.findByRole("option", { name: "Oats" }));

      expect(
        screen.getByRole("button", { name: "Remove Oats" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove ingredient 2" }),
      ).toBeInTheDocument();
    });

    test("clears the last row instead of removing it", async () => {
      const user = userEvent.setup();
      render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

      await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
      await user.click(await screen.findByRole("option", { name: "Oats" }));
      await user.type(screen.getByLabelText("Grams 1"), "80");
      await user.click(screen.getByRole("button", { name: "Clear Oats" }));

      expect(
        screen.getByRole("combobox", { name: "Ingredient 1" }),
      ).toHaveValue("");
      expect(screen.getByLabelText("Grams 1")).toHaveValue(null);
      expect(
        screen.getByRole("button", { name: "Clear ingredient 1" }),
      ).toBeInTheDocument();
    });
  });

  describe("validation messages", () => {
    const rowErrors = {
      "items.0.ingredientId": ["Pick the first."],
      "items.1.grams": ["Weigh the second."],
    };

    /** Renders two rows, then the same fields answering a submit with `errors`. */
    const renderWithErrors = async (
      user: ReturnType<typeof userEvent.setup>,
      errors: MealFieldErrors,
    ) => {
      const { rerender } = render(
        <MealFields ingredients={ingredients} fieldErrors={{}} />,
      );
      await user.click(screen.getByRole("button", { name: "Add ingredient" }));
      rerender(<MealFields ingredients={ingredients} fieldErrors={errors} />);

      return rerender;
    };

    test("clears the name's message once it changes", async () => {
      const user = userEvent.setup();
      await renderWithErrors(user, { name: ["Name is required"] });

      const name = screen.getByLabelText("Name");
      expect(name).toHaveAttribute("aria-invalid", "true");

      await user.type(name, "P");

      expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
      expect(name).not.toHaveAttribute("aria-invalid");
    });

    test("clears only the message of the field that changed", async () => {
      const user = userEvent.setup();
      await renderWithErrors(user, rowErrors);

      await user.type(screen.getByLabelText("Grams 2"), "5");

      expect(screen.queryByText("Weigh the second.")).not.toBeInTheDocument();
      expect(screen.getByText("Pick the first.")).toBeInTheDocument();
    });

    test("clears an ingredient's message once one is chosen", async () => {
      const user = userEvent.setup();
      await renderWithErrors(user, rowErrors);

      await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
      await user.click(await screen.findByRole("option", { name: "Oats" }));

      expect(screen.queryByText("Pick the first.")).not.toBeInTheDocument();
    });

    test("keeps a message on its row when an earlier row is removed", async () => {
      const user = userEvent.setup();
      await renderWithErrors(user, {
        "items.1.grams": ["Weigh the second."],
      });

      await user.click(
        screen.getByRole("button", { name: "Remove ingredient 1" }),
      );

      expect(screen.getByLabelText("Grams 1")).toHaveAccessibleDescription(
        "Weigh the second.",
      );
    });

    test("removes a message along with its row", async () => {
      const user = userEvent.setup();
      await renderWithErrors(user, {
        "items.0.grams": ["Weigh the first."],
      });

      await user.click(
        screen.getByRole("button", { name: "Remove ingredient 1" }),
      );

      expect(screen.queryByText("Weigh the first.")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Grams 1")).not.toHaveAttribute(
        "aria-invalid",
      );
    });

    test("shows a new submit's messages again", async () => {
      const user = userEvent.setup();
      const rerender = await renderWithErrors(user, {
        name: ["Name is required"],
      });

      await user.type(screen.getByLabelText("Name"), "P");
      rerender(
        <MealFields
          ingredients={ingredients}
          fieldErrors={{ name: ["Name is required"] }}
        />,
      );

      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  test("announces the preview's totals, once there are any", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));
    await user.type(screen.getByLabelText("Grams 1"), "200");

    expect(screen.getByRole("status")).toHaveTextContent(
      "This meal: 330 kcal, 63 g protein, 0 g carbs, 7.2 g fat.",
    );
  });

  test("clips a long ingredient name in its picker and the list", async () => {
    const user = userEvent.setup();
    const longName = "a".repeat(60);
    render(
      <MealFields
        ingredients={[makeIngredient({ id: "ing-long", name: longName })]}
        fieldErrors={{}}
      />,
    );

    const picker = screen.getByRole("combobox", { name: "Ingredient 1" });
    // The group must be able to shrink below the name's intrinsic width,
    // otherwise it grows past its column (and the popup with it).
    expect(picker.parentElement).toHaveClass("min-w-0");
    expect(picker.parentElement?.parentElement).toHaveClass("min-w-0");

    await user.click(picker);
    const option = await screen.findByRole("option", { name: longName });
    expect(within(option).getByText(longName)).toHaveClass("truncate");
    expect(option).toHaveAttribute("title", longName);

    await user.click(option);
    expect(picker).toHaveAttribute("title", longName);
  });
});

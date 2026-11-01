import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { useFocusFirstInvalid } from "@/components/auth/use-focus-first-invalid";

/** A form whose second and third inputs turn invalid with `errors`. */
function Form({ errors }: { errors: { invalid?: boolean } }) {
  const formRef = useFocusFirstInvalid(errors);
  const invalid = errors.invalid ? true : undefined;

  return (
    <form ref={formRef}>
      <input aria-label="First" />
      <input aria-label="Second" aria-invalid={invalid} />
      <input aria-label="Third" aria-invalid={invalid} />
    </form>
  );
}

describe("useFocusFirstInvalid", () => {
  test("leaves focus alone while nothing is invalid", () => {
    render(<Form errors={{}} />);

    expect(document.body).toHaveFocus();
  });

  test("focuses the first invalid input", () => {
    const { rerender } = render(<Form errors={{}} />);

    rerender(<Form errors={{ invalid: true }} />);

    expect(screen.getByLabelText("Second")).toHaveFocus();
  });

  test("moves focus back on a repeat failure with the same errors", () => {
    const { rerender } = render(<Form errors={{ invalid: true }} />);
    screen.getByLabelText("First").focus();

    rerender(<Form errors={{ invalid: true }} />);

    expect(screen.getByLabelText("Second")).toHaveFocus();
  });
});

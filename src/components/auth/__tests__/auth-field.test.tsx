import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { AuthField } from "@/components/auth/auth-field";

describe("AuthField", () => {
  test("has no visibility toggle on non-password inputs", () => {
    render(<AuthField id="email" type="email" label="Email" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  test("hides a password by default and toggles it on and off", async () => {
    const user = userEvent.setup();
    render(<AuthField id="pw" type="password" label="Password" />);
    const input = screen.getByLabelText("Password");

    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  test("keeps the typed value and does not submit the form when toggling", async () => {
    const user = userEvent.setup();
    render(<AuthField id="pw" type="password" label="Password" />);

    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveValue("secret");
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  test("describes the input with its helper line while it is valid", () => {
    render(
      <AuthField
        id="pw"
        type="password"
        label="Password"
        description="At least 12 characters."
      />,
    );
    const input = screen.getByLabelText("Password");

    expect(input).toHaveAccessibleDescription("At least 12 characters.");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  test("replaces the helper line with the first error", () => {
    render(
      <AuthField
        id="pw"
        type="password"
        label="Password"
        description="At least 12 characters."
        errors={["Password is too short", "Second message"]}
      />,
    );
    const input = screen.getByLabelText("Password");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Password is too short");
    expect(screen.queryByText("At least 12 characters.")).toBeNull();
    expect(screen.queryByText("Second message")).toBeNull();
  });

  test("wires an error to a non-password input too", () => {
    render(
      <AuthField
        id="email"
        type="email"
        label="Email"
        errors={["Email is required"]}
      />,
    );

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Email is required",
    );
  });

  test("treats an empty error list as valid", () => {
    render(<AuthField id="email" type="email" label="Email" errors={[]} />);

    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});

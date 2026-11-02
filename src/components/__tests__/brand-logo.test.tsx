import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AcornMark, NutriaLogo } from "@/components/brand-logo";

/** Reads a file relative to the repository root. */
function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

/** Lists the path data of an SVG source, in document order. */
function sourcePaths(svg: string) {
  return [...svg.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
}

/** Lists the path data of a rendered element, in document order. */
function renderedPaths(container: HTMLElement) {
  return [...container.querySelectorAll("path")].map((path) =>
    path.getAttribute("d"),
  );
}

describe("AcornMark", () => {
  test("paints in the current colour and passes attributes through", () => {
    const { container } = render(<AcornMark className="text-brand h-6" />);

    expect(container.querySelector("svg")).toHaveClass("text-brand", "h-6");
    expect(container.querySelector("path")).toHaveAttribute(
      "fill",
      "currentColor",
    );
  });

  test("is hidden from assistive technology", () => {
    const { container } = render(<AcornMark />);

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  test("matches the master artwork", () => {
    const { container } = render(<AcornMark />);

    expect(renderedPaths(container)).toEqual(
      sourcePaths(read("docs/brand/acorn.svg")),
    );
  });
});

describe("NutriaLogo", () => {
  test("paints the acorn in brand and the otter in the theme's text colour", () => {
    const { container } = render(<NutriaLogo />);
    const [acorn, otter] = container.querySelectorAll("path");

    expect(acorn).toHaveClass("fill-brand");
    expect(acorn).not.toHaveAttribute("fill");
    expect(otter).toHaveAttribute("fill", "currentColor");
  });

  test("hardcodes no colour from the master artwork", () => {
    const { container } = render(<NutriaLogo />);

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  test("is hidden from assistive technology", () => {
    const { container } = render(<NutriaLogo />);

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  test("matches the master artwork", () => {
    const { container } = render(<NutriaLogo />);

    expect(renderedPaths(container)).toEqual(
      sourcePaths(read("docs/brand/nutria.svg")),
    );
  });
});

describe("favicon", () => {
  const icon = read("src/app/icon.svg");

  test("draws the acorn from the master artwork", () => {
    expect(sourcePaths(icon)).toEqual(
      sourcePaths(read("docs/brand/acorn.svg")),
    );
  });

  test("uses the brand green of each colour scheme", () => {
    expect(icon).toContain('fill="#059669"');
    expect(icon).toMatch(/prefers-color-scheme:dark.*#34d399/);
  });

  test("has a square canvas so browsers don't stretch it", () => {
    const [, , , width, height] =
      icon.match(/viewBox="(\S+) (\S+) (\S+) (\S+)"/) ?? [];

    expect(width).toBeDefined();
    expect(width).toBe(height);
  });
});

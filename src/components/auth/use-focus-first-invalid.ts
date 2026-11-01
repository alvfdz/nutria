import { useEffect, useRef, type RefObject } from "react";

/**
 * Moves focus to a form's first invalid input whenever its field errors change,
 * so keyboard and screen reader users land on what needs fixing and hear its
 * message through the input's `aria-describedby`. Does nothing while no input
 * is invalid, which leaves focus alone on mount and after a valid submit.
 *
 * @param fieldErrors The form's current field errors. Each failed submit must
 *   pass a new object, even with the same messages, so focus moves again.
 * @returns A ref to attach to the form.
 */
export function useFocusFirstInvalid(
  fieldErrors: object,
): RefObject<HTMLFormElement | null> {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [fieldErrors]);

  return formRef;
}

import { forwardRef, type ComponentPropsWithoutRef } from "react";

/**
 * Minimal attributes for native date/time inputs so Safari / iOS / macOS use system
 * picker popovers. Pair with your own border/background classes per surface.
 * Do not add `appearance-none` on these inputs — it breaks native wheels on iOS.
 */
export const NATIVE_DATE_TIME_CHROME = "min-h-[44px] max-w-full [color-scheme:light_dark]";

type DateProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export const NativeDateInput = forwardRef<HTMLInputElement, DateProps>(function NativeDateInput(
  { className, ...rest },
  ref
) {
  return (
    <input ref={ref} type="date" className={[NATIVE_DATE_TIME_CHROME, className].filter(Boolean).join(" ")} {...rest} />
  );
});

export const NativeDatetimeLocalInput = forwardRef<HTMLInputElement, DateProps>(
  function NativeDatetimeLocalInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="datetime-local"
        className={[NATIVE_DATE_TIME_CHROME, className].filter(Boolean).join(" ")}
        {...rest}
      />
    );
  }
);

export const NativeTimeInput = forwardRef<HTMLInputElement, DateProps>(function NativeTimeInput(
  { className, ...rest },
  ref
) {
  return (
    <input ref={ref} type="time" className={[NATIVE_DATE_TIME_CHROME, className].filter(Boolean).join(" ")} {...rest} />
  );
});

"use client";

/** A submit button that asks first. Used for anything that destroys data. */
export function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}

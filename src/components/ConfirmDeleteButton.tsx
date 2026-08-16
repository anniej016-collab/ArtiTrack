import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export function ConfirmDeleteButton({ artistName }: { artistName: string }) {
  return (
    <ConfirmSubmitButton
      message={`Remove ${artistName} and every release logged for them? This can't be undone.`}
      className="text-xs font-medium text-faint transition-colors hover:text-red-400"
    >
      Remove artist entirely
    </ConfirmSubmitButton>
  );
}

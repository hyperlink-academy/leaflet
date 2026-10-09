import { useToaster } from "components/Toast";
import { actionErrorContent } from "components/OAuthError";
import type { Result } from "src/result";

// Runs a Result-returning action and toasts its failure, thrown or
// returned, with the message for the error type when there is one. Resolves
// the wrapped value on success (so a null value is still truthy), undefined
// otherwise.
export function useActionToast<E extends { type: string }>(
  messages: Partial<Record<E["type"], string>>,
) {
  let toaster = useToaster();
  return async <T,>(
    action: () => Promise<Result<T, E>>,
  ): Promise<{ value: T } | undefined> => {
    let error: E;
    try {
      let result = await action();
      if (result.ok) return { value: result.value };
      error = result.error;
    } catch {
      error = { type: "failed" } as E;
    }
    toaster({
      content: actionErrorContent(
        error,
        messages[error.type as E["type"]] ?? "Oh no! Something went wrong!",
      ),
      type: "error",
    });
    return undefined;
  };
}

"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useToaster } from "components/Toast";
import { replaceWithoutParams } from "src/utils/replaceWithoutParams";

// Fires a toast for the `recommend` after-sign-in action: the oauth callback
// recommends the post server-side, then redirects back with one of these params
// (see handleAction in app/api/oauth/[route]/route.ts).
export function RecommendConfirmationToast() {
  let router = useRouter();
  let pathname = usePathname();
  let searchParams = useSearchParams();
  let toaster = useToaster();

  useEffect(() => {
    let success = searchParams.get("showRecommendSuccess") === "true";
    let error = searchParams.get("showRecommendError") === "true";
    if (!success && !error) return;

    replaceWithoutParams(router, pathname, searchParams, [
      "showRecommendSuccess",
      "showRecommendError",
    ]);

    if (success) {
      toaster({
        type: "success",
        content: <div className="font-bold">Recc'd! Thanks for sharing!</div>,
      });
    } else {
      toaster({
        type: "error",
        content: "We couldn't recommend this post. Please try again.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

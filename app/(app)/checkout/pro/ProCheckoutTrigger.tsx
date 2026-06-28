"use client";

import { useEffect, useRef, useState } from "react";
import { createCheckoutSession } from "actions/createCheckoutSession";
import { DotLoader } from "components/utils/DotLoader";

export function ProCheckoutTrigger({
  cadence,
  coupon,
}: {
  cadence: "month" | "year";
  coupon?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const result = await createCheckoutSession(cadence, "/home", coupon);
      if (result.ok) {
        window.location.href = result.value.url;
      } else {
        setError(result.error);
      }
    })();
  }, [cadence, coupon]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center max-w-sm w-full mx-auto">
      {error ? (
        <>
          <h3>We couldn't start checkout</h3>
          <div className="text-secondary leading-snug">{error}</div>
        </>
      ) : (
        <>
          <DotLoader />
          <div className="text-secondary leading-snug">
            Redirecting you to Stripe checkout…
          </div>
        </>
      )}
    </div>
  );
}

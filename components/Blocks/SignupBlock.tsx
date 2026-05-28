import { useState } from "react";
import { useUIState } from "src/useUIState";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { BlockProps, BlockLayout } from "./Block";
import { EmailInput } from "components/Subscribe/EmailSubscribe";
import { ButtonPrimary } from "components/Buttons";

// SignupBlock is a static, non-interactive preview of the publication subscribe
// form, styled to match SubscribePanel (components/Subscribe/SubscribeButton.tsx).
// It is shown in the editor — the real, working form is rendered on the
// published page (see PostContent.tsx's signup case). No user data is fetched.
export const SignupBlock = (
  props: BlockProps & {
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let { normalizedPublication } = useLeafletPublicationData();
  let [email, setEmail] = useState("");

  let publicationName = normalizedPublication?.name || "Subscribe";
  let publicationDescription = normalizedPublication?.description;

  return (
    <BlockLayout
      isSelected={!!isSelected}
      areYouSure={props.areYouSure}
      setAreYouSure={props.setAreYouSure}
      className="accent-container rounded-lg! border-none! p-0! text-center justify-center"
    >
      <div className="px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5">
        <h3 className="leading-snug text-secondary">{publicationName}</h3>
        {publicationDescription && (
          <div className="text-tertiary pb-1">{publicationDescription}</div>
        )}
        <div className="max-w-sm w-full mx-auto pt-2">
          <EmailInput
            value={email}
            onChange={setEmail}
            action={
              <ButtonPrimary
                type="button"
                compact
                className="leading-tight! outline-none! text-sm!"
              >
                Subscribe
              </ButtonPrimary>
            }
          />
        </div>
      </div>
    </BlockLayout>
  );
};

"use client";
import useSWR from "swr";
import { getMyPendingPublicationActions } from "actions/pendingPublicationActions";
import { useIdentityData } from "components/IdentityProvider";
import { ActionNeededTiny } from "components/Icons/ActionNeededTiny";
import { Popover } from "components/Popover";
import {
  combinePendingPublicationActions,
  describePendingPublicationActions,
  pendingPublicationActionEntries,
  pendingPublicationActionTotal,
  type PostPendingPublicationActions,
} from "src/pendingPublicationActionKinds";

export function usePendingPublicationActions(publication: string | undefined) {
  let { identity } = useIdentityData();
  let did = identity?.atp_did;
  let { data } = useSWR(
    did ? ["my_pending_publication_actions", did] : null,
    () => getMyPendingPublicationActions(),
  );
  return (publication && data?.[publication]) || {};
}

export function PendingPublicationActionsIndicator(props: {
  publication: string;
}) {
  let actions = combinePendingPublicationActions(
    usePendingPublicationActions(props.publication),
  );
  let total = pendingPublicationActionTotal(actions);
  if (!total) return null;
  return (
    <ActionNeededTiny
      role="img"
      aria-label={`${describePendingPublicationActions(actions)} ${total === 1 ? "needs" : "need"} your attention`}
      className="text-accent-contrast"
    />
  );
}

export function PendingPublicationActionsCount(props: {
  actions?: PostPendingPublicationActions;
  postUrl: string;
}) {
  let total = pendingPublicationActionTotal(props.actions);
  if (!total || !props.actions) return null;
  return (
    <Popover
      align="center"
      className="text-sm"
      trigger={
        <span className="pendingPublicationActionCount shrink-0 flex gap-1 items-center bg-accent-1 h-fit pl-1.5 pr-2 py-0.5 rounded-full text-accent-2 text-xs leading-none font-bold text-center">
          <ActionNeededTiny aria-hidden className="shrink-0" />
          {total}
          <span className="sr-only">
            {describePendingPublicationActions(props.actions)} pending
          </span>
        </span>
      }
    >
      <div className="text-sm text-tertiary flex flex-col gap-1 ">
        {pendingPublicationActionEntries(props.actions).map(
          ({ kind, n, label }) => (
            <>
              <div key={kind} className="flex items-center gap-2">
                {n} {n === 1 ? label.pending.one : label.pending.other}
              </div>
              <hr className="last:hidden -mx-1" />
            </>
          ),
        )}
      </div>
    </Popover>
  );
}

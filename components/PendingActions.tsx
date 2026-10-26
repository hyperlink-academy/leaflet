"use client";
import useSWR from "swr";
import { getMyPendingActions } from "actions/pendingActions";
import { useIdentityData } from "components/IdentityProvider";
import { ActionNeededTiny } from "components/Icons/ActionNeededTiny";
import { Popover } from "components/Popover";
import {
  combinePendingActions,
  describePendingActions,
  pendingActionEntries,
  pendingActionTotal,
  type PostPendingActions,
} from "src/pendingActionKinds";

function useMyPendingActions() {
  let { identity } = useIdentityData();
  let did = identity?.atp_did;
  return (
    useSWR(did ? ["my_pending_actions", did] : null, () =>
      getMyPendingActions(),
    ).data ?? {}
  );
}

export function usePublicationPendingActions(publication: string | undefined) {
  let actions = useMyPendingActions();
  return (publication && actions[publication]) || {};
}

export function PendingActionsIndicator(props: { publication: string }) {
  let actions = combinePendingActions(
    usePublicationPendingActions(props.publication),
  );
  let total = pendingActionTotal(actions);
  if (!total) return null;
  return (
    <ActionNeededTiny
      role="img"
      aria-label={`${describePendingActions(actions)} ${total === 1 ? "needs" : "need"} your attention`}
      className="text-accent-contrast"
    />
  );
}

export function PendingActionsCount(props: {
  actions?: PostPendingActions;
  postUrl: string;
}) {
  let total = pendingActionTotal(props.actions);
  if (!total || !props.actions) return null;
  return (
    <Popover
      align="center"
      className="text-sm"
      trigger={
        <span className="pendingActionCount shrink-0 flex gap-1 items-center bg-accent-1 h-fit pl-1.5 pr-2 py-0.5 rounded-full text-accent-2 text-xs leading-none font-bold text-center">
          <ActionNeededTiny aria-hidden className="shrink-0" />
          {total}
          <span className="sr-only">
            {describePendingActions(props.actions)} pending
          </span>
        </span>
      }
    >
      <div className="text-sm text-tertiary flex flex-col gap-1 ">
        {pendingActionEntries(props.actions).map(({ kind, n, label }) => (
          <>
            <div key={kind} className="flex items-center gap-2">
              {n} {n === 1 ? label.pending.one : label.pending.other}
            </div>
            <hr className="last:hidden -mx-1" />
          </>
        ))}
      </div>
    </Popover>
  );
}

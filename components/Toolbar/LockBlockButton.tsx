import { useUIState } from "src/useUIState";
import { ToolbarButton } from ".";
import { useEntity, useReplicache } from "src/replicache";

import { focusBlock } from "src/utils/focusBlock";
import { Props } from "components/Icons/Props";

export function LockBlockButton() {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let selectedBlocks = useUIState((s) => s.selectedBlocks);
  let type = useEntity(focusedBlock?.entityID || null, "block/type");
  let locked = useEntity(focusedBlock?.entityID || null, "block/is-locked");
  let { rep } = useReplicache();
  if (focusedBlock?.entityType !== "block") return;
  return (
    <ToolbarButton
      disabled={false}
      onClick={async () => {
        if (!locked?.data.value) {
          await rep?.mutate.assertFact({
            entity: focusedBlock.entityID,
            attribute: "block/is-locked",
            data: { value: true, type: "boolean" },
          });
          if (selectedBlocks.length > 1) {
            for (let block of selectedBlocks) {
              await rep?.mutate.assertFact({
                attribute: "block/is-locked",
                entity: block.value,
                data: { value: true, type: "boolean" },
              });
            }
          }
        } else {
          await rep?.mutate.retractFact({ factID: locked.id });
          if (selectedBlocks.length > 1) {
            for (let block of selectedBlocks) {
              await rep?.mutate.retractAttribute({
                attribute: "block/is-locked",
                entity: block.value,
              });
            }
          } else {
            type &&
              focusBlock(
                {
                  type: type.data.value,
                  parent: focusedBlock.parent,
                  value: focusedBlock.entityID,
                },
                { type: "end" },
              );
          }
        }
      }}
      tooltipContent={
        <span>{!locked?.data.value ? "Lock Editing" : " Unlock to Edit"}</span>
      }
    >
      {!locked?.data.value ? <LockSmall /> : <UnlockSmall />}
    </ToolbarButton>
  );
}

const LockSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 3.9657C9.73217 3.9657 7.89374 5.80413 7.89374 8.07196V10.1794H7.78851C6.82201 10.1794 6.03851 10.9629 6.03851 11.9294V17C6.03851 18.6569 7.38166 20 9.03851 20H14.9615C16.6184 20 17.9615 18.6569 17.9615 17V11.9294C17.9615 10.9629 17.178 10.1794 16.2115 10.1794H16.1063V8.07196C16.1063 5.80413 14.2678 3.9657 12 3.9657ZM14.3563 10.1794V8.07196C14.3563 6.77063 13.3013 5.7157 12 5.7157C10.6987 5.7157 9.64374 6.77063 9.64374 8.07196V10.1794H14.3563ZM12.5824 15.3512C12.9924 15.1399 13.2727 14.7123 13.2727 14.2193C13.2727 13.5165 12.7029 12.9467 12 12.9467C11.2972 12.9467 10.7274 13.5165 10.7274 14.2193C10.7274 14.7271 11.0247 15.1654 11.4548 15.3696L11.2418 17.267C11.2252 17.4152 11.3411 17.5449 11.4902 17.5449H12.5147C12.6621 17.5449 12.7774 17.4181 12.7636 17.2714L12.5824 15.3512Z"
        fill="currentColor"
      />
    </svg>
  );
};

const UnlockSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.89376 6.62482C7.89376 4.35699 9.7322 2.51855 12 2.51855C14.2678 2.51855 16.1063 4.35699 16.1063 6.62482V10.1794H16.2115C17.178 10.1794 17.9615 10.9629 17.9615 11.9294V17C17.9615 18.6569 16.6184 20 14.9615 20H9.03854C7.38168 20 6.03854 18.6569 6.03854 17V11.9294C6.03854 10.9629 6.82204 10.1794 7.78854 10.1794H14.3563V6.62482C14.3563 5.32349 13.3013 4.26855 12 4.26855C10.6987 4.26855 9.64376 5.32349 9.64376 6.62482V7.72078C9.64376 8.20403 9.25201 8.59578 8.76876 8.59578C8.28551 8.59578 7.89376 8.20403 7.89376 7.72078V6.62482ZM13.1496 14.2193C13.1496 14.7123 12.8693 15.1399 12.4593 15.3512L12.6405 17.2714C12.6544 17.4181 12.539 17.5449 12.3916 17.5449H11.3672C11.218 17.5449 11.1021 17.4152 11.1187 17.267L11.3317 15.3696C10.9016 15.1654 10.6043 14.7271 10.6043 14.2193C10.6043 13.5165 11.1741 12.9467 11.8769 12.9467C12.5798 12.9467 13.1496 13.5165 13.1496 14.2193ZM5.62896 5.3862C5.4215 5.20395 5.10558 5.2244 4.92333 5.43186C4.74109 5.63932 4.76153 5.95525 4.969 6.13749L6.06209 7.09771C6.26955 7.27996 6.58548 7.25951 6.76772 7.05205C6.94997 6.84458 6.92952 6.52866 6.72206 6.34642L5.62896 5.3862ZM3.5165 6.64283C3.25418 6.55657 2.97159 6.69929 2.88533 6.96161C2.79906 7.22393 2.94178 7.50652 3.20411 7.59278L5.54822 8.36366C5.81054 8.44992 6.09313 8.3072 6.1794 8.04488C6.26566 7.78256 6.12294 7.49997 5.86062 7.41371L3.5165 6.64283ZM3.54574 9.42431C3.52207 9.14918 3.72592 8.90696 4.00105 8.8833L5.52254 8.75244C5.79766 8.72878 6.03988 8.93263 6.06354 9.20776C6.08721 9.48288 5.88335 9.7251 5.60823 9.74876L4.08674 9.87962C3.81162 9.90329 3.5694 9.69943 3.54574 9.42431Z"
        fill="currentColor"
      />
    </svg>
  );
};

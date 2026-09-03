"use client";

import { useEffect, useState } from "react";

import { ButtonPrimary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { LoginContent } from "components/LoginButton";
import { Modal } from "components/Modal";
import { Popover } from "components/Popover";
import { AccountList } from "components/ActionBar/AccountSwitcher";
import { useSavedAccounts } from "src/hooks/useSavedAccounts";

const UPGRADE_ROUTE = "/upgrade";

export function UpgradeAccountSwitcher() {
  let { identity } = useIdentityData();
  let { data: savedAccounts } = useSavedAccounts();
  let [open, setOpen] = useState(false);
  let [addAccountOpen, setAddAccountOpen] = useState(false);

  let [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  let hasOtherAccounts =
    mounted && savedAccounts.some((a) => a.identity !== identity?.id);

  let openAddAccount = () => {
    setOpen(false);
    setAddAccountOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-2 items-center">
        {hasOtherAccounts ? (
          <Popover
            open={open}
            onOpenChange={setOpen}
            align="center"
            className="w-xs p-1!"
            trigger={
              <div className="text-accent-contrast hover:underline">
                Switch Account
              </div>
            }
          >
            <AccountList
              redirectTo={UPGRADE_ROUTE}
              onAddAccount={openAddAccount}
            />
          </Popover>
        ) : (
          <button
            onClick={openAddAccount}
            className="text-accent-contrast hover:underline"
          >
            Use different account
          </button>
        )}
      </div>
      <Modal
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        className="w-full!"
      >
        <LoginContent
          addAccount
          open={addAccountOpen}
          redirectRoute={UPGRADE_ROUTE}
          onSuccess={() => {
            window.location.href = UPGRADE_ROUTE;
          }}
        />
      </Modal>
    </>
  );
}

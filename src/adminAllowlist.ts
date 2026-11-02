// Identity ids allowed to use the /admin entitlement-management UI. Lives in a
// plain lib (not a "use server" file) so the check can't be invoked as an
// endpoint.
export const ADMIN_IDENTITY_IDS = [
  "f874b1bb-2d0a-4ad6-8069-1b7525126730",
  "2f0fc71f-c730-4e2a-bc98-16a519c2e392",
  "e9881337-72c2-4427-b34f-89db14d890b6",
  "d55248b8-133a-437e-9cef-190816dffaf0",
];

export function isAdminIdentity(identityId: string | null | undefined): boolean {
  return !!identityId && ADMIN_IDENTITY_IDS.includes(identityId);
}

// Emails allowed to use the /admin entitlement-management UI. Lives in a plain
// lib (not a "use server" file) so the check can't be invoked as an endpoint.
export const ADMIN_EMAILS = [
  "jared@hyperlink.academy",
  "thisiscelinepark@gmail.com",
  "brendan.schlagel@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

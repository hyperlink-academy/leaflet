// Gates preview features by signed-in identity, independently of NODE_ENV.
// Server actions for those features must also check this identity gate.
export function isDevMode(
  identity:
    | { atp_did?: string | null; email?: string | null }
    | null
    | undefined,
): boolean {
  return (
    identity?.atp_did === "did:plc:nb7a7tldqk7jbnij6jvdj5eg" ||
    identity?.email === "jared@hyperlink.academy"
  );
}

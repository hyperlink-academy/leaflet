// Sandbox for iframes rendering user-pasted HTML via srcdoc. Never add
// allow-same-origin: srcdoc documents inherit the parent origin, so a
// same-origin sandbox would let pasted HTML script against the app.
export const srcDocSandbox = "allow-scripts allow-popups allow-forms";

// Runs after the HTML loads, before hydration (see the instrumentation-client
// docs). Starting the launch clock here, rather than in a component, means it
// covers time no React code has run yet.
import {
  beginDocumentLaunch,
  beginSoftLaunch,
} from "src/launchInstrumentation";

beginDocumentLaunch();

export function onRouterTransitionStart(url: string) {
  beginSoftLaunch(url);
}

import { makeAPIClient } from "./lib";
import type { Routes } from "./[command]/route";
import { CACHEABLE_ROUTES } from "./cacheableRoutes";

export const callRPC = makeAPIClient<Routes>("/api/rpc", CACHEABLE_ROUTES);

import { makeAPIClient } from "./lib";
import type { Routes } from "./[command]/route";

export const callRPC = makeAPIClient<Routes>("/api/rpc");

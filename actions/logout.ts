"use server";

import { cookies } from "next/headers";
import { removeAuthToken } from "src/auth";

export async function logout() {
  await removeAuthToken();
  (await cookies()).delete("identity");
}

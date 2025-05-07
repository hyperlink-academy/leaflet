"use server";

import { cookies } from "next/headers";

export async function logout() {
  (await cookies()).delete("auth_token");
  (await cookies()).delete("identity");
}

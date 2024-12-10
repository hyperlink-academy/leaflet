import { cookies } from "next/headers";
import LoginForm from "./LoginForm";
import { logout } from "actions/logout";

export default function LoginPage() {
  let cookieStore = cookies();
  let identity = cookieStore.get("auth_token")?.value;
  if (!identity)
    return (
      <div>
        this is a login page!
        <LoginForm />
      </div>
    );
  return (
    <div>
      identity: {identity}
      <form action={logout}>
        <button>logout</button>
      </form>
    </div>
  );
}

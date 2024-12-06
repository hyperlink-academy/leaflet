import { cookies } from "next/headers";
import LoginForm from "./LoginForm";

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
  let logout = async function () {
    "use server";
    console.log("this work?");
    cookies().delete("auth_token");
    cookies().delete("identity");
  };
  return (
    <div>
      identity: {identity}
      <form action={logout}>
        <button>logout</button>
      </form>
    </div>
  );
}

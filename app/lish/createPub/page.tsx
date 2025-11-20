import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { CreatePubForm } from "./CreatePubForm";
import { getIdentityData } from "actions/getIdentityData";
import LoginForm from "app/login/LoginForm";

export default async function CreatePub() {
  let identity = await getIdentityData();
  if (!identity)
    return (
      <div className="createPubPage relative w-full h-full flex items-stretch bg-bg-leaflet p-4">
        <div className="createPubContent h-full flex items-center max-w-sm w-full mx-auto">
          <div className="container w-full p-3 justify-items-center text-center">
            <LoginForm
              text="Log in to create a publication!"
              noEmail
              redirectRoute={"/lish/createPub"}
            />
          </div>
        </div>
      </div>
    );
  return (
    // Eventually this can pull from home theme?
    <ThemeProvider entityID={null}>
      <div className="createPubPage relative w-full h-full flex items-stretch bg-bg-leaflet p-4">
        <div className="createPubContent h-full flex items-center max-w-sm w-full mx-auto">
          <div className="createPubFormWrapper h-fit w-full flex flex-col gap-4">
            <h2 className="text-center">Create Your Publication!</h2>
            <div className="opaque-container w-full sm:py-4 p-3">
              <CreatePubForm />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

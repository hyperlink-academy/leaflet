import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { CreatePubForm } from "./CreatePubForm";

export default async function CreatePub() {
  return (
    // Eventually this can pull from home theme?
    <ThemeProvider entityID={null}>
      <div className="createPubPage relative w-full h-full flex items-stretch bg-bg-leaflet p-4">
        <div className="createPubContent h-full flex items-center max-w-sm w-full mx-auto ">
          <div className="createPubFormWrapper h-fit w-full flex flex-col gap-4">
            <h2 className="text-center">Create Your Publication!</h2>
            <div className="container w-full  p-3">
              <CreatePubForm />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

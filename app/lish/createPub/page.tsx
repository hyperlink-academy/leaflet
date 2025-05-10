import { CreatePubForm } from "./CreatePubForm";

export default async function CreatePub() {
  return (
    <div className="createPubPage relative w-full h-screen flex items-stretch bg-bg-leaflet p-4">
      <div className="createPubContent h-full flex items-center max-w-sm w-full mx-auto ">
        <div className="createPubFormWrapper h-fit w-full flex flex-col gap-4">
          <h2 className="text-center">Create Your Publication!</h2>
          <CreatePubForm />
        </div>
      </div>
    </div>
  );
}

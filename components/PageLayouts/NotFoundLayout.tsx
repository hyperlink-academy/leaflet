export const NotFoundLayout = (props: { children: React.ReactNode }) => {
  return (
    <div className="w-screen h-full flex place-items-center bg-bg-leaflet p-4">
      <div className="bg-bg-page mx-auto p-4 border border-border rounded-md flex flex-col text-center justify-center gap-1 w-fit">
        {props.children}
      </div>
    </div>
  );
};

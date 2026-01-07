import { PubSettingsHeader } from "./PublicationSettings";

export const PostOptions = (props: {
  backToMenu: () => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
}) => {
  return (
    <div className="text-primary flex flex-col">
      <PubSettingsHeader
        loading={props.loading}
        setLoadingAction={props.setLoading}
        backToMenuAction={props.backToMenu}
        state={"post-options"}
      >
        Post Options
      </PubSettingsHeader>
      <h4>Layout</h4>
      <div>Post Width</div>
      <div>Show Prev Next Buttons</div>
      <hr />
      <h4>Interactions</h4>
      <div>Show Comments</div>
      <div>Show Mentions</div>
    </div>
  );
};

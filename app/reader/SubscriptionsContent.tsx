import { PubListing } from "app/discover/PubListing";
import { ButtonPrimary } from "components/Buttons";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { Json } from "supabase/database.types";

export const SubscriptionsContent = (props: {
  publications: {
    record: Json;
    uri: string;
    documents_in_publications: {
      documents: { data: Json; indexed_at: string } | null;
    }[];
  }[];
}) => {
  if (props.publications.length === 0) return <SubscriptionsEmpty />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {props.publications?.map((p) => <PubListing key={p.uri} {...p} />)}
    </div>
  );
};

const SubscriptionsEmpty = () => {
  return (
    <div className="flex flex-col gap-2 container bg-[rgba(var(--bg-page),.7)] sm:p-4 p-3 justify-between text-center font-bold text-tertiary">
      You haven't subscribed to any publications yet!
      <ButtonPrimary className="mx-auto place-self-center">
        <DiscoverSmall /> Discover Publications
      </ButtonPrimary>
    </div>
  );
};

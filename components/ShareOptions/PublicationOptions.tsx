import { publishToPublication } from "actions/publishToPublication";
import { ButtonPrimary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { InputWithLabel } from "components/Input";
import { useState } from "react";
import { Popover } from "components/Popover";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";
import { usePublicationContext } from "components/Providers/PublicationContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const PublishToPublication = () => {
  type PublishState =
    | { state: "default" }
    | { state: "test" }
    | { state: "testSuccess" }
    | { state: "success"; link: string };

  let [state, setState] = useState<PublishState>({ state: "default" });
  let publication = usePublicationContext();
  let rep = useReplicache();
  let rootPage = useEntity(rep.rootEntity, "root/page")[0];
  let blocks = useBlocks(rootPage?.data.value);
  let router = useRouter();

  let [titleValue, setTitleValue] = useState("");
  let [descriptionValue, setDescriptionValue] = useState("");
  let [testValue, setTestValue] = useState("");
  if (!publication.publication) return null;

  return (
    <Popover
      onOpenChange={() => setState({ state: "default" })}
      asChild
      trigger={<ButtonPrimary className="">Publish</ButtonPrimary>}
    >
      <div className="publishMenu w-96 flex flex-col gap-3">
        {state.state === "default" ? (
          <>
            <div className="w-full flex flex-col">
              <h3 className="place-self-start">
                Publish to {publication.publication.name}
              </h3>
              {/* <small className="text-tertiary">
                Publish this post to a PUBLICATION HERE and send it as an email
                to your XX subscribers.
              </small> */}
            </div>
            <form
              className="flex flex-col gap-3 w-full"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!publication.publication) return;
                let data = await publishToPublication(
                  rep.rootEntity,
                  blocks,
                  publication.publication.uri,
                );
                if (data)
                  setState({
                    state: "success",
                    link: `/lish/${data.handle?.alsoKnownAs?.[0].slice(5)}/${publication.publication.name}/${data.rkey}`,
                  });
              }}
            >
              <InputWithLabel
                label="Title"
                value={titleValue}
                onChange={(e) => {
                  setTitleValue(e.currentTarget.value);
                }}
              />
              <InputWithLabel
                textarea
                rows={3}
                label="Description"
                value={descriptionValue}
                onChange={(e) => {
                  setDescriptionValue(e.currentTarget.value);
                }}
              />
              <div className="flex gap-3 justify-end w-full">
                {/* <button
                  onClick={() => {
                    setState({ state: "test" });
                  }}
                  className="font-bold text-accent-contrast"
                >
                  Send Test
                </button> */}
                <ButtonPrimary>Publish </ButtonPrimary>
              </div>
            </form>
          </>
        ) : state.state === "test" ? (
          <>
            <h3>Send out a test</h3>
            <form
              className="flex flex-col gap-3"
              onSubmit={() => {
                setState({ state: "testSuccess" });
              }}
            >
              <InputWithLabel
                label="Send to"
                placeholder="email here..."
                value={testValue}
                onChange={(e) => {
                  setTestValue(e.currentTarget.value);
                }}
              />

              <ButtonPrimary type="submit" className="place-self-end">
                Send Test
              </ButtonPrimary>
            </form>
          </>
        ) : state.state === "testSuccess" ? (
          <>
            <div
              className="w-full p-4 rounded-md flex flex-col text-center"
              style={{
                backgroundColor:
                  "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
              }}
            >
              <div>Sent! Check you email!</div>
              <div className="italic font-bold">{testValue}</div>
              <button
                onClick={() => {
                  setState({ state: "default" });
                }}
                className="w-fit mx-auto font-bold text-accent-contrast mt-3"
              >
                Back
              </button>
            </div>
          </>
        ) : state.state === "success" ? (
          <div
            className="w-full p-4 rounded-md flex flex-col text-center"
            style={{
              backgroundColor:
                "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
            }}
          >
            <div className="font-bold">Woot! It's Published!</div>
            <Link
              href={state.link}
              className="w-fit mx-auto font-bold text-accent-contrast mt-1"
            >
              View Post
            </Link>
          </div>
        ) : null}
      </div>
    </Popover>
  );
};

import { publishtoPublication } from "actions/publishToPublication";
import { ButtonPrimary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { InputWithLabel } from "components/Input";
import { useState } from "react";
import { Popover } from "components/Popover";
import { useBlocks } from "src/hooks/queries/useBlocks";
import { useEntity, useReplicache } from "src/replicache";

export const AddToPublicationMenu = () => {
  let { identity } = useIdentityData();
  let rep = useReplicache();
  let rootPage = useEntity(rep.rootEntity, "root/page")[0];
  let blocks = useBlocks(rootPage?.data.value);
  if (!identity || identity.publications.length === 0) return null;

  return (
    <div>
      {identity.publications.map((p) => (
        <button
          onClick={() => {
            publishtoPublication(rep.rootEntity, blocks, p.uri);
          }}
        >
          publish to {p.name}
        </button>
      ))}
    </div>
  );
};

export const PublishToPublication = () => {
  let [state, setState] = useState<
    "default" | "test" | "testSuccess" | "success"
  >("default");

  let [titleValue, setTitleValue] = useState("");
  let [descriptionValue, setDescriptionValue] = useState("");
  let [testValue, setTestValue] = useState("");

  return (
    <Popover
      onOpenChange={() => setState("default")}
      asChild
      trigger={<ButtonPrimary className="">Publish</ButtonPrimary>}
    >
      <div className="publishMenu w-96 flex flex-col gap-3">
        {state === "default" ? (
          <>
            <div className="w-full flex flex-col">
              <h3 className="place-self-start">Publish to Pub Name Here</h3>
              <small className="text-tertiary">
                Publish this post to a PUBLICATION HERE and send it as an email
                to your XX subscribers.
              </small>
            </div>
            <form
              className="flex flex-col gap-3 w-full"
              onSubmit={() => {
                setState("success");
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
                <button
                  onClick={() => {
                    setState("test");
                  }}
                  className="font-bold text-accent-contrast"
                >
                  Send Test
                </button>
                <ButtonPrimary>Publish </ButtonPrimary>
              </div>
            </form>
          </>
        ) : state === "test" ? (
          <>
            <h3>Send out a test</h3>
            <form
              className="flex flex-col gap-3"
              onSubmit={() => {
                setState("testSuccess");
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
        ) : state === "testSuccess" ? (
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
                  setState("default");
                }}
                className="w-fit mx-auto font-bold text-accent-contrast mt-3"
              >
                Back
              </button>
            </div>
          </>
        ) : state === "success" ? (
          <div
            className="w-full p-4 rounded-md flex flex-col text-center"
            style={{
              backgroundColor:
                "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
            }}
          >
            <div className="font-bold">Woot! It's Published!</div>
            <button
              onClick={() => {
                setState("test");
              }}
              className="w-fit mx-auto font-bold text-accent-contrast mt-1"
            >
              View Post
            </button>
          </div>
        ) : null}
      </div>
    </Popover>
  );
};

import { useEntity, useReplicache } from "src/replicache";
import { CloseTiny } from "components/Icons";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";

export const ExternalLinkBlock = (props: { entityID: string }) => {
  let previewImage = useEntity(props.entityID, "link/preview");
  let title = useEntity(props.entityID, "link/title");
  let description = useEntity(props.entityID, "link/description");
  let url = useEntity(props.entityID, "link/url");

  let selected = useUIState((s) =>
    s.selectedBlock.find((b) => b.value === props.entityID),
  );
  let permission = useEntitySetContext().permissions.write;
  let { rep } = useReplicache();

  return (
    <a
      href={url?.data.value}
      target="_blank"
      className={`
        externalLinkBlock flex relative group/linkBlock
        h-[104px]  bg-bg-card overflow-hidden text-primary no-underline
        border  hover:border-accent-1 outline outline-1 hover:outline-accent-1 rounded-lg shadow-sm
        ${selected ? "outline-accent-1 border-accent-1" : "outline-transparent border-border-light"}
        `}
    >
      <div className="pt-2 pb-2 px-2 grow min-w-0">
        <div className="flex flex-col w-full min-w-0 h-full grow ">
          <div
            className={`linkBlockTitle bg-transparent -mb-0.5  border-none text-base font-bold outline-none resize-none align-top border h-[24px] line-clamp-1`}
          >
            {title?.data.value}
          </div>

          <div
            className={`linkBlockDescription text-sm bg-transparent border-none outline-none resize-none align-top  grow line-clamp-2`}
          >
            {description?.data.value}
          </div>
          <div
            className={`inline-block place-self-end w-full text-xs  italic line-clamp-1 truncate group-hover/linkBlock:text-accent-1 ${selected ? "text-accent-1" : "text-tertiary"}`}
          >
            {url?.data.value}
          </div>
        </div>
      </div>

      <div
        className={`linkBlockPreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border rotate-[4deg] origin-center`}
        style={{
          backgroundImage: `url(${previewImage?.data.src})`,
          backgroundPosition: "center",
        }}
      />

      {permission && (
        <button
          className="absolute p-1 top-0.5 right-0.5 hover:text-accent-1 text-secondary sm:hidden sm:group-hover/linkBlock:block"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            rep &&
              rep.mutate.removeBlock({
                blockEntity: props.entityID,
              });
          }}
        >
          <CloseTiny />
        </button>
      )}
    </a>
  );
};

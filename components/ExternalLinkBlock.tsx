import { useEntity } from "src/replicache";
import { CloseTiny } from "./Icons";

export const ExternalLinkBlock = (props: { entityID: string }) => {
  let previewImage = useEntity(props.entityID, "link/preview");
  let title = useEntity(props.entityID, "link/title");
  let description = useEntity(props.entityID, "link/description");
  let url = useEntity(props.entityID, "link/url");

  return (
    <a
      href={url?.data.value}
      target="_blank"
      className="externalLinkBlock relative group h-[104px]  mb-3  flex  border border-border hover:border-accent outline outline-1 outline-transparent hover:outline-accent rounded-lg overflow-hidden"
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
          <div className="inline-block place-self-end w-full text-xs text-tertiary italic line-clamp-1 truncate group-hover:text-accent">
            {url?.data.value}
          </div>
        </div>
      </div>

      <div
        className={`linkBlockPreview w-[120px] m-2 -mb-2 bg-cover shrink-0 rounded-t-md border border-border group-hover:border-accent`}
        style={{ backgroundImage: `url(${previewImage?.data.src})` }}
      />
    </a>
  );
};

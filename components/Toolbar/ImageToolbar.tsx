"use client";
import { ToolbarButton } from ".";
import { useEntity, useReplicache } from "src/replicache";
import { useUIState } from "src/useUIState";
import { Props } from "components/Icons/Props";
import { ImageAltSmall, ImageRemoveAltSmall } from "components/Icons/ImageAlt";
import { useLeafletPublicationData } from "components/PageSWRDataProvider";
import { useSubscribe } from "src/replicache/useSubscribe";
import {
  ImageCoverImage,
  ImageCoverImageRemove,
} from "components/Icons/ImageCoverImage";
import { Separator } from "components/Layout";
import { TextAlignmentButton } from "./TextAlignmentToolbar";

export const ImageToolbar = (props: {
  setToolbarState: (state: "image" | "text-alignment") => void;
}) => {
  let focusedEntity = useUIState((s) => s.focusedEntity);
  let focusedEntityType = useEntity(
    focusedEntity?.entityType === "page"
      ? focusedEntity.entityID
      : focusedEntity?.parent || null,
    "page/type",
  );

  return (
    <div className="flex items-center gap-2 justify-between w-full">
      <div className="flex items-center gap-2">
        <TextAlignmentButton setToolbarState={props.setToolbarState} />
        <ImageAltTextButton />
        <ImageFullBleedButton />
        <ImageCoverButton />
        {focusedEntityType?.data.value !== "canvas" && (
          <Separator classname="h-6!" />
        )}
      </div>
    </div>
  );
};

export const ImageFullBleedButton = (props: {}) => {
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedEntity)?.entityID || null;
  let isFullBleed = useEntity(focusedBlock, "image/full-bleed")?.data.value;
  let hasSrc = useEntity(focusedBlock, "block/image")?.data;
  if (!hasSrc) return null;

  return (
    <ToolbarButton
      hiddenOnCanvas
      active={isFullBleed}
      onClick={async (e) => {
        e.preventDefault();
        if (rep && focusedBlock) {
          await rep.mutate.assertFact({
            entity: focusedBlock,
            attribute: "image/full-bleed",
            data: { type: "boolean", value: !isFullBleed },
          });
        }
      }}
      tooltipContent={<div className="">Toggle Full Bleed</div>}
    >
      {isFullBleed ? <ImageFullBleedOnSmall /> : <ImageFullBleedOffSmall />}
    </ToolbarButton>
  );
};

export const ImageAltTextButton = (props: {}) => {
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedEntity)?.entityID || null;

  let altText = useEntity(focusedBlock, "image/alt")?.data.value;

  let setAltEditorOpen = useUIState((s) => s.setOpenPopover);
  let altEditorOpen = useUIState((s) => s.openPopover === focusedBlock);
  let hasSrc = useEntity(focusedBlock, "block/image")?.data;
  if (!hasSrc) return null;
  return (
    <ToolbarButton
      active={altText !== undefined}
      onClick={async (e) => {
        e.preventDefault();
        if (!focusedBlock) return;
        if (altText === undefined) {
          await rep?.mutate.assertFact({
            entity: focusedBlock,
            attribute: "image/alt",
            data: { type: "string", value: "" },
          });
          setAltEditorOpen(focusedBlock);
        } else {
          await rep?.mutate.retractAttribute({
            entity: focusedBlock,
            attribute: "image/alt",
          });
          setAltEditorOpen(null);
        }
      }}
      tooltipContent={
        <div>{altText === undefined ? "Add " : "Remove "}Alt Text</div>
      }
    >
      {altText === undefined ? (
        <ImageAltSmall fillColor="transparent" />
      ) : (
        <ImageRemoveAltSmall />
      )}
    </ToolbarButton>
  );
};

export const ImageCoverButton = () => {
  let { rep } = useReplicache();
  let focusedBlock = useUIState((s) => s.focusedEntity)?.entityID || null;
  let hasSrc = useEntity(focusedBlock, "block/image")?.data;
  let { data: pubData } = useLeafletPublicationData();
  let coverImage = useSubscribe(rep, (tx) =>
    tx.get<string | null>("publication_cover_image"),
  );

  // Only show if in a publication and has an image
  if (!pubData?.publications || !hasSrc) return null;

  let isCoverImage = coverImage === focusedBlock;

  return (
    <ToolbarButton
      active={isCoverImage}
      onClick={async (e) => {
        e.preventDefault();
        if (rep && focusedBlock) {
          await rep.mutate.updatePublicationDraft({
            cover_image: isCoverImage ? null : focusedBlock,
          });
        }
      }}
      tooltipContent={
        <div>{isCoverImage ? "Remove Cover Image" : "Use as Cover Image"}</div>
      }
    >
      {isCoverImage ? <ImageCoverImageRemove /> : <ImageCoverImage />}
    </ToolbarButton>
  );
};

const ImageFullBleedOffSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.82922 8.93921C1.41501 8.93921 1.07922 8.60342 1.07922 8.18921V6.18921C1.07922 4.11814 2.75816 2.43921 4.82922 2.43921H6.82922C7.24344 2.43921 7.57922 2.775 7.57922 3.18921C7.57922 3.60342 7.24344 3.93921 6.82922 3.93921L4.82922 3.93921C3.58658 3.93921 2.57922 4.94657 2.57922 6.18921L2.57922 8.18921C2.57922 8.60342 2.24344 8.93921 1.82922 8.93921ZM17.1708 2.43921C16.7566 2.43921 16.4208 2.775 16.4208 3.18921C16.4208 3.60342 16.7566 3.93921 17.1708 3.93921H19.1708C20.4134 3.93921 21.4208 4.94657 21.4208 6.18921V8.18921C21.4208 8.60342 21.7566 8.93921 22.1708 8.93921C22.585 8.93921 22.9208 8.60342 22.9208 8.18921V6.18921C22.9208 4.11814 21.2418 2.43921 19.1708 2.43921H17.1708ZM17.1708 21.5608C16.7566 21.5608 16.4208 21.225 16.4208 20.8108C16.4208 20.3966 16.7566 20.0608 17.1708 20.0608H19.1708C20.4134 20.0608 21.4208 19.0534 21.4208 17.8108V15.8108C21.4208 15.3966 21.7566 15.0608 22.1708 15.0608C22.585 15.0608 22.9208 15.3966 22.9208 15.8108V17.8108C22.9208 19.8819 21.2418 21.5608 19.1708 21.5608H17.1708ZM1.07922 15.8108C1.07922 15.3966 1.41501 15.0608 1.82922 15.0608C2.24344 15.0608 2.57922 15.3966 2.57922 15.8108L2.57922 17.8108C2.57922 19.0534 3.58658 20.0608 4.82922 20.0608H6.82922C7.24344 20.0608 7.57922 20.3966 7.57922 20.8108C7.57922 21.225 7.24344 21.5608 6.82922 21.5608H4.82922C2.75816 21.5608 1.07922 19.8819 1.07922 17.8108V15.8108ZM7.37924 12.5162L9.08548 13.6549L8.56422 14.1568C8.38144 14.3328 8.09583 14.3439 7.89985 14.1828L7.63847 13.9678C7.21682 13.6211 6.64007 13.5308 6.13263 13.7321L5.92453 13.8146L7.37924 12.5162ZM10.8169 14.8104L9.93703 14.2232L9.2578 14.8772C8.70944 15.4051 7.8526 15.4386 7.26468 14.9552L7.0033 14.7402C6.86275 14.6246 6.6705 14.5945 6.50135 14.6616L4.95422 15.2753V17.0608C4.95422 17.406 5.23405 17.6858 5.57922 17.6858H18.3533C18.6985 17.6858 18.9783 17.406 18.9783 17.0608V12.526L18.5888 12.2077L18.091 13.0482C17.7153 13.6825 16.9345 13.9498 16.249 13.6788L15.1568 13.2471C15.0216 13.1937 14.8698 13.2017 14.741 13.2692L14.2876 13.5067C13.809 13.7574 13.2325 13.7313 12.7785 13.4384L12.4416 13.2211L11.5777 14.1178L11.782 14.2556C12.011 14.4099 12.0714 14.7207 11.9171 14.9497C11.7627 15.1786 11.4519 15.2391 11.223 15.0847L10.8341 14.8225C10.8282 14.8186 10.8225 14.8145 10.8169 14.8104ZM17.8056 11.5677L17.2306 12.5386C17.1053 12.7501 16.8451 12.8392 16.6166 12.7488L15.5244 12.3171C15.1188 12.1568 14.6634 12.181 14.277 12.3834L13.8236 12.6209C13.6641 12.7044 13.4719 12.6957 13.3206 12.5981L13.1486 12.4871L15.6953 9.84339L17.8056 11.5677ZM16.328 9.06903L18.9783 11.2346V6.93921C18.9783 6.59403 18.6985 6.31421 18.3533 6.31421H5.57922C5.23405 6.31421 4.95422 6.59403 4.95422 6.93921V13.3403L6.71336 11.7702C7.05329 11.4668 7.55535 11.4315 7.93434 11.6845L10.7337 13.5526L14.9751 9.14962C15.3363 8.77464 15.9248 8.73958 16.328 9.06903ZM5.57922 5.06421C4.54369 5.06421 3.70422 5.90368 3.70422 6.93921V17.0608C3.70422 18.0963 4.54369 18.9358 5.57922 18.9358H18.3533C19.3889 18.9358 20.2283 18.0963 20.2283 17.0608V6.93921C20.2283 5.90368 19.3889 5.06421 18.3533 5.06421H5.57922ZM8.87793 8.73889C8.87793 8.4316 9.12704 8.1825 9.43433 8.1825C9.74162 8.1825 9.99073 8.4316 9.99073 8.73889C9.99073 9.04619 9.74162 9.29529 9.43433 9.29529C9.12704 9.29529 8.87793 9.04619 8.87793 8.73889ZM9.43433 7.1825C8.57475 7.1825 7.87793 7.87932 7.87793 8.73889C7.87793 9.59847 8.57475 10.2953 9.43433 10.2953C10.2939 10.2953 10.9907 9.59847 10.9907 8.73889C10.9907 7.87932 10.2939 7.1825 9.43433 7.1825Z"
        fill="currentColor"
      />
    </svg>
  );
};
const ImageFullBleedOnSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.712524 5.68921C0.712524 3.96332 2.11163 2.56421 3.83752 2.56421H20.1624C21.8883 2.56421 23.2874 3.96332 23.2874 5.68921V18.3108C23.2874 20.0367 21.8883 21.4358 20.1624 21.4358H3.83752C2.11164 21.4358 0.712524 20.0367 0.712524 18.3108V5.68921ZM3.83752 3.81421C2.80199 3.81421 1.96252 4.65368 1.96252 5.68921V14.1901L4.82906 11.6316C5.21149 11.2902 5.7763 11.2506 6.20267 11.5351L10.2892 14.2624L16.3336 7.98778C16.573 7.73919 16.9687 7.73179 17.2173 7.97126C17.4659 8.21074 17.4733 8.6064 17.2338 8.85499L13.5626 12.6661L14.0542 13.0054C14.1688 13.0845 14.3178 13.0936 14.4412 13.0289L15.5068 12.4708C15.8425 12.2949 16.2291 12.242 16.5997 12.321L18.8672 12.8047C18.9866 12.8301 19.1109 12.7959 19.2004 12.7129L20.5274 11.4827C20.4554 11.282 20.4879 11.0496 20.6334 10.8732C20.8531 10.607 21.247 10.5692 21.5133 10.7889L22.0374 11.2213V5.68921C22.0374 4.65368 21.198 3.81421 20.1624 3.81421H3.83752ZM21.4356 12.3453L20.0502 13.6296C19.6624 13.9892 19.1237 14.1375 18.6065 14.0272L16.339 13.5435C16.2535 13.5253 16.1642 13.5375 16.0868 13.5781L15.0212 14.1362C14.4866 14.4163 13.8408 14.377 13.3441 14.0341L12.6838 13.5783L11.3433 14.9699L11.6378 15.1684C11.9241 15.3613 11.9997 15.7498 11.8068 16.036C11.6139 16.3222 11.2255 16.3979 10.9392 16.205L10.0299 15.5921L10.0276 15.5905L9.07582 14.9554L7.84586 16.0297C7.58589 16.2568 7.19106 16.2301 6.96399 15.9702C6.73691 15.7102 6.76357 15.3154 7.02354 15.0883L7.99868 14.2365L5.58925 12.6286L2.3289 15.5385C2.22302 15.6331 2.09388 15.6849 1.96252 15.6953V18.3108C1.96252 19.3463 2.80199 20.1858 3.83752 20.1858H20.1624C21.198 20.1858 22.0374 19.3463 22.0374 18.3108V12.8418L21.4356 12.3453ZM9.71952 6.20252C9.39162 6.0947 9.03839 6.27312 8.93057 6.60102C8.82275 6.92893 9.00116 7.28216 9.32907 7.38998C9.67978 7.5053 9.84306 7.66604 9.92838 7.80233C10.02 7.94875 10.0598 8.12899 10.0598 8.33053C10.0598 8.79991 9.67925 9.18042 9.20987 9.18042C9.06221 9.18042 8.79851 9.10649 8.58819 8.92328C8.40267 8.76167 8.25172 8.51136 8.28005 8.10042C8.3038 7.75606 8.04389 7.45765 7.69953 7.4339C7.35517 7.41015 7.05676 7.67006 7.03302 8.01442C6.97619 8.83849 7.30377 9.46218 7.76714 9.86582C8.20571 10.2479 8.76126 10.4304 9.20987 10.4304C10.3696 10.4304 11.3098 9.49027 11.3098 8.33053C11.3098 7.97485 11.2407 7.54299 10.9879 7.13909C10.7287 6.72507 10.3118 6.39728 9.71952 6.20252ZM16.1204 5.922C16.1204 5.50778 16.4561 5.172 16.8704 5.172H19.3704C20.0607 5.172 20.6204 5.73164 20.6204 6.422V8.922C20.6204 9.33621 20.2846 9.672 19.8704 9.672C19.4561 9.672 19.1204 9.33621 19.1204 8.922V6.672H16.8704C16.4561 6.672 16.1204 6.33621 16.1204 5.922ZM16.8704 18.8224C16.4561 18.8224 16.1204 18.4866 16.1204 18.0724C16.1204 17.6582 16.4561 17.3224 16.8704 17.3224H19.1204V15.0724C19.1204 14.6582 19.4561 14.3224 19.8704 14.3224C20.2846 14.3224 20.6204 14.6582 20.6204 15.0724V17.5724C20.6204 18.2627 20.0607 18.8224 19.3704 18.8224H16.8704ZM7.84949 5.9248C7.84949 5.51059 7.5137 5.1748 7.09949 5.1748H4.59949C3.90913 5.1748 3.34949 5.73445 3.34949 6.4248V8.9248C3.34949 9.33902 3.68527 9.6748 4.09949 9.6748C4.5137 9.6748 4.84949 9.33902 4.84949 8.9248V6.6748H7.09949C7.5137 6.6748 7.84949 6.33902 7.84949 5.9248ZM7.09949 18.8252C7.5137 18.8252 7.84949 18.4894 7.84949 18.0752C7.84949 17.661 7.5137 17.3252 7.09949 17.3252H4.84949V15.0752C4.84949 14.661 4.5137 14.3252 4.09949 14.3252C3.68527 14.3252 3.34949 14.661 3.34949 15.0752V17.5752C3.34949 18.2656 3.90913 18.8252 4.59949 18.8252H7.09949Z"
        fill="currentColor"
      />
    </svg>
  );
};

import { GalleryImageItem } from "./GalleryImageItem";

export function ImageGalleryStrip(props: {
  imageEntities: string[];
  gap: number;
  editable: boolean;
  selected: boolean;
  onImageClick: (index: number) => void;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: `${props.gap}px` }}>
      {props.imageEntities.map((entityID, i) => (
        <GalleryImageItem
          key={entityID}
          entityID={entityID}
          editable={props.editable}
          selected={props.selected}
          onClick={() => props.onImageClick(i)}
          className="w-full"
          buttonClassName="block w-full"
          imgClassName="w-full h-auto"
        />
      ))}
    </div>
  );
}

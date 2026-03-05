import { useCallback } from "react";
import { useFootnoteContext } from "./FootnoteContext";
import { FootnoteEditor } from "./FootnoteEditor";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { deleteFootnoteFromBlock } from "./deleteFootnoteFromBlock";
import { FootnoteSideColumnLayout } from "./FootnoteSideColumnLayout";

type EditorFootnoteItem = {
  id: string;
  index: number;
  footnoteEntityID: string;
  blockID: string;
};

export function FootnoteSideColumn(props: {
  pageEntityID: string;
  visible: boolean;
}) {
  let { footnotes } = useFootnoteContext();
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();

  let items: EditorFootnoteItem[] = footnotes.map((fn) => ({
    id: fn.footnoteEntityID,
    index: fn.index,
    footnoteEntityID: fn.footnoteEntityID,
    blockID: fn.blockID,
  }));

  let getAnchorSelector = useCallback(
    (item: EditorFootnoteItem) =>
      `.footnote-ref[data-footnote-id="${item.id}"]`,
    [],
  );

  let renderItem = useCallback(
    (item: EditorFootnoteItem & { top: number }) => (
      <FootnoteEditor
        footnoteEntityID={item.footnoteEntityID}
        index={item.index}
        editable={permissions.write}
        onDelete={
          permissions.write
            ? () => deleteFootnoteFromBlock(item.footnoteEntityID, item.blockID, rep.rep)
            : undefined
        }
      />
    ),
    [permissions.write, rep.rep],
  );

  return (
    <FootnoteSideColumnLayout
      items={items}
      visible={props.visible}
      getAnchorSelector={getAnchorSelector}
      renderItem={renderItem}
    />
  );
}

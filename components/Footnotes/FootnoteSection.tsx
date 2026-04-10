import { useFootnoteContext } from "./FootnoteContext";
import { FootnoteEditor } from "./FootnoteEditor";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { deleteFootnoteFromBlock } from "./deleteFootnoteFromBlock";
import { FootnoteSectionLayout } from "./FootnoteItemLayout";

export function FootnoteSection(props: { hiddenOnDesktop?: boolean }) {
  let { footnotes } = useFootnoteContext();
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();

  if (footnotes.length === 0) return null;

  return (
    <FootnoteSectionLayout className={props.hiddenOnDesktop ? "xl:hidden" : ""}>
      {footnotes.map((fn) => (
        <FootnoteEditor
          key={fn.footnoteEntityID}
          footnoteEntityID={fn.footnoteEntityID}
          index={fn.index}
          editable={permissions.write}
          onDelete={
            permissions.write
              ? () => {
                  deleteFootnoteFromBlock(
                    fn.footnoteEntityID,
                    fn.blockID,
                    rep.rep,
                  );
                }
              : undefined
          }
        />
      ))}
    </FootnoteSectionLayout>
  );
}

import { useFootnoteContext } from "./FootnoteContext";
import { FootnoteEditor } from "./FootnoteEditor";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { deleteFootnoteFromBlock } from "./deleteFootnoteFromBlock";

export function FootnoteSection(props: { hiddenOnDesktop?: boolean }) {
  let { footnotes } = useFootnoteContext();
  let { permissions } = useEntitySetContext();
  let rep = useReplicache();

  if (footnotes.length === 0) return null;

  return (
    <div className={`footnote-section px-3 sm:px-4 pb-2 ${props.hiddenOnDesktop ? "lg:hidden" : ""}`}>
      <hr className="border-border-light mb-3" />
      <div className="flex flex-col gap-2">
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
      </div>
    </div>
  );
}

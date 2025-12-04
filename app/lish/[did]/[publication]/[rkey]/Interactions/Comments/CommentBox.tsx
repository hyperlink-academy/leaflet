import { UnicodeString } from "@atproto/api";
import { autolink } from "components/Blocks/TextBlock/autolink-plugin";
import { multiBlockSchema } from "components/Blocks/TextBlock/schema";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { Mark, MarkType, Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history, redo, undo } from "prosemirror-history";
import {
  MutableRefObject,
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { publishComment } from "./commentAction";
import { ButtonPrimary } from "components/Buttons";
import { ShareSmall } from "components/Icons/ShareSmall";
import { useInteractionState, setInteractionState } from "../Interactions";
import { DotLoader } from "components/utils/DotLoader";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";
import { setMark } from "src/utils/prosemirror/setMark";
import { multi } from "linkifyjs";
import { Json } from "supabase/database.types";
import { isIOS } from "src/utils/isDevice";
import {
  decodeQuotePosition,
  QUOTE_PARAM,
  QuotePosition,
} from "../../quotePosition";
import { QuoteContent } from "../Quotes";
import { create } from "zustand";
import { CloseTiny } from "components/Icons/CloseTiny";
import { CloseFillTiny } from "components/Icons/CloseFillTiny";
import { betterIsUrl } from "src/utils/isURL";

export function CommentBox(props: {
  doc_uri: string;
  pageId?: string;
  replyTo?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  let mountRef = useRef<HTMLPreElement | null>(null);
  let {
    commentBox: { quote },
  } = useInteractionState(props.doc_uri);
  let [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading || !view.current) return;

    setLoading(true);
    let currentState = view.current.state;
    let [plaintext, facets] = docToFacetedText(currentState.doc);
    let comment = await publishComment({
      pageId: props.pageId,
      document: props.doc_uri,
      comment: {
        plaintext,
        facets,
        replyTo: props.replyTo,
        attachment: quote
          ? {
              $type: "pub.leaflet.comment#linearDocumentQuote",
              document: props.doc_uri,
              quote,
            }
          : undefined,
      },
    });

    let tr = currentState.tr;
    tr = tr.replaceWith(
      0,
      currentState.doc.content.size,
      multiBlockSchema.nodes.paragraph.createAndFill()!,
    );
    view.current.dispatch(tr);
    setLoading(false);
    props.onSubmit?.();
    setInteractionState(props.doc_uri, (s) => ({
      commentBox: {
        quote: null,
      },
      localComments: [
        ...s.localComments,
        {
          record: comment.record,
          uri: comment.uri,
          bsky_profiles: { record: comment.profile as Json },
        },
      ],
    }));
  };

  let [editorState, setEditorState] = useState(() =>
    EditorState.create({
      schema: multiBlockSchema,
      plugins: [
        keymap({
          "Meta-b": toggleMark(multiBlockSchema.marks.strong),
          "Ctrl-b": toggleMark(multiBlockSchema.marks.strong),
          "Meta-u": toggleMark(multiBlockSchema.marks.underline),
          "Ctrl-u": toggleMark(multiBlockSchema.marks.underline),
          "Meta-i": toggleMark(multiBlockSchema.marks.em),
          "Ctrl-i": toggleMark(multiBlockSchema.marks.em),
          "Ctrl-Meta-x": toggleMark(multiBlockSchema.marks.strikethrough),
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
          "Ctrl-Enter": () => {
            handleSubmit();
            return true;
          },
          "Meta-Enter": () => {
            handleSubmit();
            return true;
          },
        }),
        keymap(baseKeymap),
        autolink({
          type: multiBlockSchema.marks.link,
          shouldAutoLink: () => true,
          defaultProtocol: "https",
        }),
        history(),
      ],
    }),
  );
  let view = useRef<null | EditorView>(null);
  useLayoutEffect(() => {
    if (!mountRef.current) return;
    view.current = new EditorView(
      { mount: mountRef.current },
      {
        state: editorState,
        handlePaste: (view, e) => {
          let text =
            e.clipboardData?.getData("text") ||
            e.clipboardData?.getData("text/html");
          let html = e.clipboardData?.getData("text/html");
          if (text && betterIsUrl(text)) {
            let selection = view.state.selection as TextSelection;
            let tr = view.state.tr;
            let { from, to } = selection;
            if (selection.empty) {
              tr.insertText(text, selection.from);
              tr.addMark(
                from,
                from + text.length,
                multiBlockSchema.marks.link.create({ href: text }),
              );
            } else {
              tr.addMark(
                from,
                to,
                multiBlockSchema.marks.link.create({ href: text }),
              );
            }
            view.dispatch(tr);
            return true;
          }
          if (!text && html) {
            let xml = new DOMParser().parseFromString(html, "text/html");
            text = xml.textContent || "";
          }
          if (
            text?.includes(QUOTE_PARAM) &&
            text.includes(window.location.toString())
          ) {
            const url = new URL(text);
            const quoteParam = url.pathname.split("/l-quote/")[1];
            if (!quoteParam) return;
            const quotePosition = decodeQuotePosition(quoteParam);
            if (!quotePosition) return;
            setInteractionState(props.doc_uri, {
              commentBox: { quote: quotePosition },
            });
            return true;
          }
        },
        handleClickOn: (view, _pos, node, _nodePos, _event, direct) => {
          if (!direct) return;
          if (node.nodeSize - 2 <= _pos) return;
          let mark =
            node
              .nodeAt(_pos - 1)
              ?.marks.find((f) => f.type === multiBlockSchema.marks.link) ||
            node
              .nodeAt(Math.max(_pos - 2, 0))
              ?.marks.find((f) => f.type === multiBlockSchema.marks.link);
          if (mark) {
            window.open(mark.attrs.href, "_blank");
          }
        },
        dispatchTransaction(tr) {
          let newState = this.state.apply(tr);
          setEditorState(newState);
          view.current?.updateState(newState);
        },
      },
    );

    if (props.autoFocus) {
      view.current.focus();
    }

    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, []);

  return (
    <div className={`flex flex-col grow ${props.className}`}>
      {quote && (
        <div className="relative mt-2 mb-2">
          <QuoteContent position={quote} did="" index={-1} />
          <button
            className="text-border absolute -top-3 right-1 bg-bg-page p-1 rounded-full"
            onClick={() =>
              setInteractionState(props.doc_uri, {
                commentBox: { quote: null },
              })
            }
          >
            <CloseFillTiny />
          </button>
        </div>
      )}
      <div className="w-full relative group">
        <pre
          ref={mountRef}
          className={`border whitespace-pre-wrap input-with-border min-h-32 h-fit px-2! py-[6px]!`}
        />
        <IOSBS view={view} />
      </div>
      <div className="flex justify-between pt-1">
        <div className="flex gap-1">
          <TextDecorationButton
            mark={multiBlockSchema.marks.strong}
            icon={<BoldTiny />}
            editor={editorState}
            view={view}
          />
          <TextDecorationButton
            mark={multiBlockSchema.marks.em}
            icon={<ItalicTiny />}
            editor={editorState}
            view={view}
          />
          <TextDecorationButton
            mark={multiBlockSchema.marks.strikethrough}
            icon={<StrikethroughTiny />}
            editor={editorState}
            view={view}
          />
        </div>
        <ButtonPrimary compact onClick={handleSubmit}>
          {loading ? <DotLoader /> : <ShareSmall />}
        </ButtonPrimary>
      </div>
    </div>
  );
}

export function IOSBS(props: { view: RefObject<EditorView | null> }) {
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);
  if (initialRender || !isIOS()) return null;
  return (
    <div
      className="h-full w-full absolute top-0 cursor-text group-focus-within:hidden"
      onPointerUp={(e) => {
        if (!props.view.current) return;
        e.preventDefault();

        let pos = props.view.current.posAtCoords({
          top: e.clientY,
          left: e.clientX,
        });

        let tr = props.view.current.state.tr;
        props.view.current.dispatch(
          tr.setSelection(TextSelection.create(tr.doc, pos?.pos || 1)),
        );
        props.view.current.focus();
      }}
    />
  );
}

export function docToFacetedText(
  doc: Node,
): [string, PubLeafletRichtextFacet.Main[]] {
  let fullText = "";
  let facets: PubLeafletRichtextFacet.Main[] = [];
  let byteOffset = 0;

  // Iterate through each paragraph in the document
  doc.forEach((paragraph) => {
    if (paragraph.type.name !== "paragraph") return;

    // Process each inline node in the paragraph
    paragraph.forEach((node) => {
      if (node.isText) {
        const text = node.text || "";
        const unicodeString = new UnicodeString(text);

        // If this text node has marks, create a facet
        if (node.marks.length > 0) {
          const facet: PubLeafletRichtextFacet.Main = {
            index: {
              byteStart: byteOffset,
              byteEnd: byteOffset + unicodeString.length,
            },
            features: marksToFeatures(node.marks),
          };

          if (facet.features.length > 0) {
            facets.push(facet);
          }
        }

        fullText += text;
        byteOffset += unicodeString.length;
      }
    });

    // Add newline between paragraphs (except after the last one)
    if (paragraph !== doc.lastChild) {
      const newline = "\n";
      const unicodeNewline = new UnicodeString(newline);
      fullText += newline;
      byteOffset += unicodeNewline.length;
    }
  });

  return [fullText, facets];
}

function marksToFeatures(marks: readonly Mark[]) {
  const features: PubLeafletRichtextFacet.Main["features"] = [];

  for (const mark of marks) {
    switch (mark.type.name) {
      case "strong":
        features.push({
          $type: "pub.leaflet.richtext.facet#bold",
        });
        break;
      case "em":
        features.push({
          $type: "pub.leaflet.richtext.facet#italic",
        });
        break;
      case "underline":
        features.push({
          $type: "pub.leaflet.richtext.facet#underline",
        });
        break;
      case "strikethrough":
        features.push({
          $type: "pub.leaflet.richtext.facet#strikethrough",
        });
        break;
      case "code":
        features.push({
          $type: "pub.leaflet.richtext.facet#code",
        });
        break;
      case "highlight":
        features.push({
          $type: "pub.leaflet.richtext.facet#highlight",
        });
        break;
      case "link":
        features.push({
          $type: "pub.leaflet.richtext.facet#link",
          uri: mark.attrs.href as string,
        });
        break;
    }
  }

  return features;
}

const BoldTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.51904 1.80078C9.39881 1.80078 10.4849 1.94674 11.062 2.2373C11.6391 2.52384 12.0714 2.91292 12.3579 3.40527C12.6444 3.8935 12.7875 4.36916 12.7876 4.98242C12.7876 5.49891 12.6921 5.82754 12.5024 6.18262C12.3128 6.53367 12.143 6.75088 11.8501 6.98242C11.5707 7.20327 11.2323 7.37691 10.8726 7.47656C10.8417 7.4851 10.8199 7.51295 10.8198 7.54492C10.8198 7.58218 10.8491 7.61315 10.8862 7.61621C11.2746 7.64684 11.6546 7.77785 12.0249 8.01074C12.4203 8.25283 12.7471 8.59809 13.0054 9.0459C13.2636 9.49384 13.3931 10.2216 13.3931 10.8633C13.3931 11.4969 13.2546 12.0133 12.9243 12.5557C12.6308 13.0377 12.1941 13.4681 11.5767 13.7627C10.9592 14.0533 9.69145 14.1992 8.73096 14.1992H2.80713C2.69673 14.1992 2.60703 14.1094 2.60693 13.999V12.4775C2.60693 12.3671 2.69667 12.2773 2.80713 12.2773H3.779C3.88946 12.2773 3.979 12.1878 3.979 12.0773V3.92266C3.979 3.8122 3.88946 3.72266 3.779 3.72266H2.80713C2.69667 3.72265 2.60693 3.63292 2.60693 3.52246V2.00098C2.60709 1.89066 2.69677 1.80078 2.80713 1.80078H8.51904ZM6.43799 8.53027C6.32753 8.53027 6.23779 8.62001 6.23779 8.73047V12.0918C6.238 12.2021 6.32766 12.291 6.43799 12.291H8.54932C9.44524 12.291 10.2343 12.0981 10.5679 11.751C10.9012 11.404 11.0583 11.1411 11.1196 10.6719C11.175 10.2478 11.0842 9.86677 10.9253 9.59375C10.7664 9.3208 10.4981 9.04179 10.1226 8.85254C9.65963 8.61937 9.11701 8.53032 8.6167 8.53027H6.43799ZM6.43799 3.72754C6.32765 3.72754 6.23799 3.81647 6.23779 3.92676V6.7207C6.23801 6.83097 6.32767 6.91992 6.43799 6.91992H8.35596C8.77567 6.91992 9.05325 6.89438 9.4126 6.79883C9.79755 6.69625 10.1309 6.37531 10.3286 6.08496C10.5304 5.79036 10.5086 5.41232 10.4976 5.07129C10.4865 4.7303 10.2791 4.42356 10.061 4.21289C9.70192 3.86602 9.14702 3.72759 8.40479 3.72754H6.43799Z"
        fill="currentColor"
      />
    </svg>
  );
};

const ItalicTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.9718 3.47455C11.945 3.6162 11.8212 3.71875 11.677 3.71875H10.1524C10.0079 3.71875 9.88393 3.82177 9.85748 3.96384L8.37739 11.9136C8.34303 12.0982 8.48463 12.2686 8.67232 12.2686H10.2232C10.4117 12.2686 10.5535 12.4404 10.5178 12.6254L10.2606 13.9571C10.2333 14.0982 10.1098 14.2002 9.96605 14.2002H4.07323C3.88472 14.2002 3.74293 14.0284 3.77867 13.8433L4.03584 12.5117C4.0631 12.3705 4.18665 12.2686 4.3304 12.2686H5.85886C6.00338 12.2686 6.12736 12.1655 6.15379 12.0234L7.63297 4.07363C7.6673 3.88912 7.52571 3.71875 7.33804 3.71875H5.79236C5.60502 3.71875 5.46351 3.54896 5.49727 3.36469L5.73891 2.04574C5.76501 1.90328 5.88916 1.7998 6.034 1.7998H11.9267C12.1148 1.7998 12.2565 1.97083 12.2215 2.15561L11.9718 3.47455Z"
        fill="currentColor"
      />
    </svg>
  );
};

const StrikethroughTiny = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.47824 10.2282C3.85747 9.95649 4.41094 9.92137 4.79752 10.3202C5.10101 10.6333 5.10273 10.8728 5.40723 11.2778C5.57421 11.4999 5.76937 11.7077 6.05762 11.8315C6.64383 12.0834 7.18409 12.1938 7.83301 12.1938C8.50278 12.1938 9.04034 12.0559 9.44531 11.7808C9.85526 11.5057 10.0605 11.166 10.0605 10.7612C10.0605 10.6778 10.0521 10.5892 10.0356 10.4999C10.0101 10.362 10.1076 10.2202 10.2479 10.2202H12.4776C12.5542 10.2202 12.6253 10.2635 12.6508 10.3357C12.8475 10.8919 12.7128 11.7814 12.2803 12.353C11.8494 12.9241 11.2497 13.371 10.4814 13.6929C9.71303 14.0148 8.82987 14.1763 7.83301 14.1763C6.36899 14.1762 5.19083 13.8689 4.29785 13.2563C3.83342 12.935 3.35679 12.332 3.11095 11.6321C2.94332 11.1549 3.04086 10.5415 3.47824 10.2282ZM7.87207 1.82373C9.27366 1.82373 10.3769 2.12237 11.1816 2.71924C11.5933 3.02271 12.1658 3.57481 12.3008 4.13037C12.4675 4.81678 12.1099 5.40264 11.459 5.45361C10.7289 5.51065 10.5556 5.13107 10.0415 4.62217C9.76697 4.35042 9.359 4.14659 8.98535 4.00928C8.57282 3.85768 8.31587 3.79834 7.87988 3.79834C7.29331 3.79835 6.80013 3.92586 6.40039 4.18018C6.00588 4.43454 5.82897 4.74493 5.77441 5.21338C5.72814 5.61106 5.80186 5.87447 6.02246 6.2085C6.36736 6.73062 7.05638 6.77775 7.67773 6.85693H14.0264C14.5784 6.85712 15.0262 7.30493 15.0264 7.85693C15.0264 8.4091 14.5785 8.85674 14.0264 8.85693H1.97363C1.42151 8.85674 0.973633 8.4091 0.973633 7.85693C0.973831 7.30493 1.42163 6.85712 1.97363 6.85693H3.7688C3.36714 6.37962 3.28552 5.7781 3.28857 5.25617C3.28338 4.51892 3.45712 3.94992 3.86208 3.40995C4.2722 2.86485 4.61406 2.57182 5.34082 2.27588C6.07288 1.97475 6.91677 1.82374 7.87207 1.82373Z"
        fill="currentColor"
      />
    </svg>
  );
};

function TextDecorationButton(props: {
  editor: EditorState;
  mark: MarkType;
  icon: React.ReactNode;
  view: RefObject<EditorView | null>;
}) {
  let hasMark: boolean = false;
  let mark: Mark | null = null;
  if (props.editor) {
    let { to, from, $cursor, $to, $from } = props.editor
      .selection as TextSelection;

    mark = rangeHasMark(props.editor, props.mark, from, to);
    if ($cursor)
      hasMark = !!props.mark.isInSet(
        props.editor.storedMarks || $cursor.marks(),
      );
    else {
      hasMark = !!mark;
    }
  }

  return (
    <button
      className={`rounded-md hover:bg-border-light p-1 ${hasMark ? "bg-border-light text-primary" : "text-border"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!props.view.current) return;
        toggleMarkInCommentBox(props.view.current, props.mark);
      }}
    >
      {props.icon}
    </button>
  );
}

function toggleMarkInCommentBox(
  view: EditorView,
  markT: MarkType,
  attrs?: any,
) {
  let { to, from, $cursor } = view.state.selection as TextSelection;
  let mark = rangeHasMark(view.state, markT, from, to);
  if (
    to === from &&
    markT?.isInSet(view.state.storedMarks || $cursor?.marks() || [])
  ) {
    return toggleMark(markT, attrs)(view.state, view.dispatch);
  }
  if (
    mark &&
    (!attrs || JSON.stringify(attrs) === JSON.stringify(mark.attrs))
  ) {
    toggleMark(markT, attrs)(view.state, view.dispatch);
  } else setMark(markT, attrs)(view.state, view.dispatch);
}

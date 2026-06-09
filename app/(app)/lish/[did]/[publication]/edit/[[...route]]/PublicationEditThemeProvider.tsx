"use client";

import { createContext, useContext } from "react";
import {
  BaseThemeProvider,
  CardBorderHiddenContext,
} from "components/ThemeManager/ThemeProvider";
import {
  usePubThemeEditorState,
  type PubThemeEditorState,
} from "components/ThemeManager/PubThemeSetter";
import { PublicationBackgroundProvider } from "components/ThemeManager/PublicationThemeProvider";
import { PublicationEditHeader } from "./PublicationEditHeader";

const PubEditThemeContext = createContext<PubThemeEditorState | null>(null);

export function usePubEditThemeState() {
  let ctx = useContext(PubEditThemeContext);
  if (!ctx)
    throw new Error(
      "usePubEditThemeState must be used within PublicationEditThemeProvider",
    );
  return ctx;
}

export function PublicationEditThemeProvider(props: {
  did: string;
  publicationName: string;
  children: React.ReactNode;
}) {
  let state = usePubThemeEditorState();
  let {
    localPubTheme,
    headingFont,
    bodyFont,
    image,
    pageWidth,
    pubBGImage,
    leafletBGRepeat,
    showPageBackground,
    record,
    pub,
  } = state;

  return (
    <PubEditThemeContext.Provider value={state}>
      <CardBorderHiddenContext.Provider value={!showPageBackground}>
        <BaseThemeProvider
          local
          {...localPubTheme}
          headingFontId={headingFont}
          bodyFontId={bodyFont}
          hasBackgroundImage={!!image}
          pageWidth={pageWidth}
        >
          <div className="flex flex-col h-full w-full bg-accent-1">
            <PublicationEditHeader
              did={props.did}
              publicationName={props.publicationName}
            />
            <div className="pubWrapper publicationScrollContainer editorScrollRoot flex flex-col grow min-h-0 bg-bg-page rounded-t-lg overflow-y-auto ">
              <PublicationBackgroundProvider
                record={record}
                pub_creator={pub?.identity_did || ""}
                localBgImage={pubBGImage}
                localBgImageRepeat={leafletBGRepeat}
                className=" h-full flex items-stretch place-items-center "
              >
                {props.children}
              </PublicationBackgroundProvider>
            </div>
          </div>
        </BaseThemeProvider>
      </CardBorderHiddenContext.Provider>
    </PubEditThemeContext.Provider>
  );
}

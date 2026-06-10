import { parseColor } from "@react-stately/color";
import {
  AtpBaseClient,
  PubLeafletPollDefinition,
  PubLeafletPublication,
} from "lexicons/api";
import { Json } from "supabase/database.types";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";
import { Lock } from "src/utils/lock";
import { supabaseServerClient } from "supabase/serverClient";
import {
  ColorToRGB,
  ColorToRGBA,
} from "components/ThemeManager/colorToLexicons";
import type { ProcessBlocksToPagesHooks } from "src/utils/factsToPagesRecord";

export function makePublishUploadHooks(
  agent: AtpBaseClient,
  did: string,
): ProcessBlocksToPagesHooks {
  const uploadLock = new Lock();
  return {
    uploadImage: async (src: string) => {
      const data = await fetch(src);
      if (data.status !== 200) return;
      const binary = await data.blob();
      return uploadLock.withLock(async () => {
        const blob = await agent.com.atproto.repo.uploadBlob(binary, {
          headers: { "Content-Type": binary.type },
        });
        return blob.data.blob;
      });
    },
    uploadPoll: async (
      entityId: string,
      record: PubLeafletPollDefinition.Record,
    ) => {
      // Use the entity id as the rkey so the editor can associate the poll
      // definition with the in-document poll block.
      const { data: pollResult } = await agent.com.atproto.repo.putRecord({
        rkey: entityId,
        repo: did,
        collection: record.$type,
        record,
        validate: false,
      });
      await supabaseServerClient.from("atp_poll_records").upsert({
        uri: pollResult.uri,
        cid: pollResult.cid,
        record: record as Json,
      });
      return { uri: pollResult.uri, cid: pollResult.cid };
    },
  };
}

// Turn the theme/* facts on a leaflet root into a record theme, uploading the
// background image to the PDS if there is one.
export async function extractThemeFromFacts(
  facts: Fact<Attribute>[],
  root_entity: string,
  agent: AtpBaseClient,
): Promise<PubLeafletPublication.Theme> {
  const scan = scanIndexLocal(facts);
  const color = (
    attribute:
      | "theme/page-background"
      | "theme/card-background"
      | "theme/primary"
      | "theme/accent-background"
      | "theme/accent-text",
  ) => {
    const value = scan.eav(root_entity, attribute)?.[0]?.data.value;
    return value ? parseColor(`hsba(${value})`) : undefined;
  };

  const pageBackground = color("theme/page-background");
  const cardBackground = color("theme/card-background");
  const primary = color("theme/primary");
  const accentBackground = color("theme/accent-background");
  const accentText = color("theme/accent-text");
  const showPageBackground = !scan.eav(
    root_entity,
    "theme/card-border-hidden",
  )[0]?.data.value;
  const backgroundImage = scan.eav(root_entity, "theme/background-image")[0];
  const backgroundImageRepeat = scan.eav(
    root_entity,
    "theme/background-image-repeat",
  )[0];
  const pageWidth = scan.eav(root_entity, "theme/page-width")[0];
  const headingFont = scan.eav(root_entity, "theme/heading-font")[0];
  const bodyFont = scan.eav(root_entity, "theme/body-font")[0];

  const theme: PubLeafletPublication.Theme = {
    $type: "pub.leaflet.publication#theme",
    showPageBackground,
  };
  if (pageWidth) theme.pageWidth = pageWidth.data.value;
  if (pageBackground) theme.backgroundColor = ColorToRGBA(pageBackground);
  if (cardBackground) theme.pageBackground = ColorToRGBA(cardBackground);
  if (primary) theme.primary = ColorToRGB(primary);
  if (accentBackground) theme.accentBackground = ColorToRGB(accentBackground);
  if (accentText) theme.accentText = ColorToRGB(accentText);
  if (headingFont) theme.headingFont = headingFont.data.value;
  if (bodyFont) theme.bodyFont = bodyFont.data.value;

  if (backgroundImage?.data) {
    const imageData = await fetch(backgroundImage.data.src);
    if (imageData.status === 200) {
      const binary = await imageData.blob();
      const blob = await agent.com.atproto.repo.uploadBlob(binary, {
        headers: { "Content-Type": binary.type },
      });
      theme.backgroundImage = {
        $type: "pub.leaflet.theme.backgroundImage",
        image: blob.data.blob,
        repeat: !!backgroundImageRepeat?.data.value,
        ...(backgroundImageRepeat?.data.value && {
          width: Math.floor(backgroundImageRepeat.data.value),
        }),
      };
    }
  }

  return theme;
}

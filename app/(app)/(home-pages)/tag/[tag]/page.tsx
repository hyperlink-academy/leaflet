import { DashboardPageLayout } from "components/PageLayouts/DashboardPageLayout";
import { getDocumentsByTag } from "./getDocumentsByTag";
import { TagContent } from "./TagContent";
import { Metadata } from "next";

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const decodedTag = decodeURIComponent(params.tag);
  return { title: `${decodedTag} - Leaflet` };
}

export default async function TagPage(props: {
  params: Promise<{ tag: string }>;
}) {
  const params = await props.params;
  const decodedTag = decodeURIComponent(params.tag);
  const { posts, nextCursor } = await getDocumentsByTag(decodedTag);

  return (
    <DashboardPageLayout
      pageTitle={decodedTag}
      scrollKey="dashboard-tag-default"
      showHeader={false}
    >
      <TagContent tag={decodedTag} posts={posts} nextCursor={nextCursor} />
    </DashboardPageLayout>
  );
}

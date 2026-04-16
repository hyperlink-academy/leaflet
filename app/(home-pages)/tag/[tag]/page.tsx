import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { PostListing } from "components/PostListing";
import { getDocumentsByTag } from "./getDocumentsByTag";
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
  const { posts } = await getDocumentsByTag(decodedTag);

  return (
    <DashboardLayout
      id="tag"
      currentPage="tag"
      defaultTab="default"
      actions={null}
      tabs={{
        default: {
          controls: null,
          content: <TagContent tag={decodedTag} posts={posts} />,
        },
      }}
    />
  );
}

const TagContent = (props: {
  tag: string;
  posts: Awaited<ReturnType<typeof getDocumentsByTag>>["posts"];
}) => {
  return (
    <div className="max-w-prose w-full grow shrink-0">
      <h1 className="sm:text-xl text-lg">Tag: {props.tag}</h1>

      <div className="pt-4 flex flex-col gap-4">
        {props.posts.length === 0 ? (
          <NoPostsForTag tag={props.tag} />
        ) : (
          <>
            <div className="text-tertiary text-sm px-3">
              {props.posts.length} {props.posts.length === 1 ? "post" : "posts"}
            </div>
            {props.posts.map((post) => (
              <PostListing key={post.documents.uri} {...post} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const NoPostsForTag = (props: { tag: string }) => {
  return (
    <div className="flex flex-col gap-2 items-center justify-center p-8 text-center">
      <div className="text-tertiary">
        No posts found with the tag "{props.tag}"
      </div>
    </div>
  );
};

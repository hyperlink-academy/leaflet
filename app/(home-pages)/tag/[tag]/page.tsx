import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { Tag } from "components/Tags";
import { PostListing } from "components/PostListing";
import { getDocumentsByTag } from "./getDocumentsByTag";
import { TagTiny } from "components/Icons/TagTiny";

export default async function TagPage(props: {
  params: Promise<{ tag: string }>;
}) {
  const params = await props.params;
  const decodedTag = decodeURIComponent(params.tag);
  const { posts } = await getDocumentsByTag(decodedTag);

  return (
    <DashboardLayout
      id="tag"
      cardBorderHidden={false}
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
    <div className="max-w-prose mx-auto w-full grow shrink-0">
      <div className="discoverHeader flex flex-col gap-3 items-center text-center pt-2 px-4">
        <TagHeader tag={props.tag} postCount={props.posts.length} />
      </div>
      <div className="pt-6 flex flex-col gap-3">
        {props.posts.length === 0 ? (
          <EmptyState tag={props.tag} />
        ) : (
          props.posts.map((post) => (
            <PostListing key={post.documents.uri} {...post} />
          ))
        )}
      </div>
    </div>
  );
};

const TagHeader = (props: { tag: string; postCount: number }) => {
  return (
    <div className="flex flex-col leading-tight items-center">
      <div className="flex items-center gap-3 text-xl font-bold text-primary">
        <TagTiny className="scale-150" />
        <h1>{props.tag}</h1>
      </div>
      <div className="text-tertiary text-sm">
        {props.postCount} {props.postCount === 1 ? "post" : "posts"}
      </div>
    </div>
  );
};

const EmptyState = (props: { tag: string }) => {
  return (
    <div className="flex flex-col gap-2 items-center justify-center p-8 text-center">
      <div className="text-tertiary">
        No posts found with the tag "{props.tag}"
      </div>
    </div>
  );
};

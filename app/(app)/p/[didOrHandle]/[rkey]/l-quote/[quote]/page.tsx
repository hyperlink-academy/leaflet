import PostPage from "app/(app)/p/[didOrHandle]/[rkey]/page";

export { generateMetadata } from "app/(app)/p/[didOrHandle]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  return <PostPage {...props} />;
}

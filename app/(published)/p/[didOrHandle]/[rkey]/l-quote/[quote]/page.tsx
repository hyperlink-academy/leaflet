import PostPage from "app/(published)/p/[didOrHandle]/[rkey]/page";

export { generateMetadata } from "app/(published)/p/[didOrHandle]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  return <PostPage {...props} />;
}

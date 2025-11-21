import PostPage from "app/p/[didOrHandle]/[rkey]/page";

export { generateMetadata } from "app/p/[didOrHandle]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  return <PostPage {...props} />;
}

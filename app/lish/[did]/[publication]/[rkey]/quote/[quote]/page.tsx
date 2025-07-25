import PostPage from "app/lish/[did]/[publication]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  return <PostPage {...props} />;
}

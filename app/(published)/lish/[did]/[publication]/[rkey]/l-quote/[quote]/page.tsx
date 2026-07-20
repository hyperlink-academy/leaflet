import PostPage, {
  generateMetadata,
} from "app/(published)/lish/[did]/[publication]/[rkey]/page";

export { generateMetadata } from "app/(published)/lish/[did]/[publication]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  return <PostPage {...props} />;
}

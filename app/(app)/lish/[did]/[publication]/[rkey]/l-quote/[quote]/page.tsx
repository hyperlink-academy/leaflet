import PostPage, {
  generateMetadata,
} from "app/(app)/lish/[did]/[publication]/[rkey]/page";

export { generateMetadata } from "app/(app)/lish/[did]/[publication]/[rkey]/page";
export default async function Post(props: {
  params: Promise<{
    publication: string;
    did: string;
    rkey: string;
    quote: string;
  }>;
}) {
  return <PostPage {...props} />;
}

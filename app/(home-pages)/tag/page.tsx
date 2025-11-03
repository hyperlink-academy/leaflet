import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { TagHeader } from "./TagHeader";
import { Tag } from "components/Tags";
import { Separator } from "components/Layout";

export default async function TagPage(props: {}) {
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
          content: <TagContent />,
        },
      }}
    />
  );
}

const TagContent = () => {
  return (
    <div className="max-w-prose mx-auto w-full grow shrink-0">
      <div className="discoverHeader flex flex-col gap-3 items-center text-center pt-2 px-4">
        <TagHeader />
        <RelatedTags />
      </div>
      <div className="pt-6 flex flex-col gap-3">
        <DummyPost />
        <DummyPost />
        <DummyPost />
        <DummyPost />
        <DummyPost />
        <DummyPost />
        <DummyPost />
        <DummyPost />
      </div>
    </div>
  );
};
const DummyPost = () => {
  return (
    <div className="h-[202px] w-full bg-bg-page border border-border-light rounded-lg" />
  );
};

const RelatedTags = () => {
  return (
    <div className="flex flex-wrap gap-1 text-tertiary text-sm items-center ">
      <div className="font-bold pr-2">Related</div>
      <Tag name="i am" />
      <Tag name="a related tag" />
      <Tag name="but i don't know" />
      <Tag name="if I'm in scope" />
    </div>
  );
};

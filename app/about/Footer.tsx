export const Footer = () => {
  return (
    <div className="aboutFooter flex w-full mt-24 text-center">
      <div className="w-screen  bg-[#57822B] -mx-12 text-white pt-3 pb-8 ">
        <div className="w-fit mx-auto flex gap-16">
          <div className="flex flex-col gap-1">
            <strong>Explore</strong>
            <div>Reader</div>
            <div>Manual</div>
          </div>
          <div className="flex flex-col gap-1">
            <strong>Contact</strong>
            <div>Email</div>
            <div>Bluesky</div>
          </div>
          <div className="flex flex-col gap-1">
            <strong>Other</strong>
            <div>Terms</div>
          </div>
        </div>
      </div>
    </div>
  );
};

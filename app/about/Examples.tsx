import { GoToArrow } from "components/Icons/GoToArrow";

export const Examples = () => {
  return (
    <div className="aboutExamples mx-auto pt-24 text-center w-full">
      <h2>Loved by thousands of writers</h2>
      <div className="flex gap-2 w-fit items-center font-bold text-[#57822B] mx-auto">
        <p>Explore More</p>
        <GoToArrow className="scale-110" />
      </div>
      <div className="flex gap-8 overflow-x-scroll pt-8 w-screen sm:w-full -mx-4 px-6 sm:mx-auto">
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />{" "}
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
        <div className="h-48 aspect-5/4 bg-test" />
      </div>
    </div>
  );
};

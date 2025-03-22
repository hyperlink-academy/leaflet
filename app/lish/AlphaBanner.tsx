import Link from "next/link";

export const AlphaBanner = () => {
  return (
    <div className="w-full h-fit text-center bg-accent-1 text-accent-2">
      We're still in Early Alpha! <Link href="./lish/">Sign Up</Link> for
      Updates :)
    </div>
  );
};

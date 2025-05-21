import { useEffect, useState } from "react";

export function DotLoader() {
  let [dots, setDots] = useState(1);
  useEffect(() => {
    let id = setInterval(() => {
      setDots((count) => (count + 1) % 4);
    }, 250);
    return () => {
      clearInterval(id);
    };
  }, []);
  return (
    <div className="w-[26px]  text-center text-sm">
      {".".repeat(dots) + "\u00a0".repeat(3 - dots)}
    </div>
  );
}

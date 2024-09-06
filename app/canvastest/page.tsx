"use client";
import { useEffect, useState } from "react";

// NOTES
// the canvas is min-w size of the page and max-w right most item until 1152px
// the page is responsive up to max-w of 1152px

// canvas is wider than the page, pan

export default function CanvasTest() {
  let [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    setHeight(document.getElementById("canvasContent")?.scrollHeight);
  }, []);

  return (
    <div
      className="leafletContentWrapper w-full h-full flex justify-center items-stretch bg-[#F0F7FA] py-8 "
      id="page-carousel"
    >
      <div
        onTouchMoveCapture={(e) => {
          e.preventDefault();
        }}
        onWheelCapture={(e) => {
          e.preventDefault();
          e.currentTarget.scrollLeft += e.deltaX;
          e.currentTarget.scrollTop += e.deltaY;
        }}
        className={`
      canvasWrapper relative mx-auto
      w-fit
      max-w-[calc(100vw-12px)] sm:max-w-[calc(100vw-128px)] lg:max-w-[1152px]
      bg-white rounded-lg border border-[#DBDBDB]
      overflow-y-scroll no-scrollbar
    `}
      >
        <div
          id="canvasContent"
          className={`canvasContent h-full w-[1150px] relative`}
          style={{ height: `calc(${height}px + 32px)` }}
        >
          <CanvasBackground color="#DBDBDB" />
          <CanvasBlock w={200} h={150} x={34} y={48} r={-15} />
          <CanvasBlock w={200} h={150} x={84} y={1248} r={15} />
          <CanvasBlock w={200} h={150} x={900} y={436} r={27} />
          <CanvasBlock w={200} h={150} x={583} y={827} r={-32} />
        </div>
      </div>
    </div>
  );
}

const CanvasBlock = (props: {
  w: number;
  h: number;
  x: number;
  y: number;
  r: number;
}) => {
  return (
    <div
      className="absolute bg-white rounded-lg border border-[#C3C3C3] p-2"
      style={{
        width: `${props.w}px`,
        height: `${props.h}px`,
        top: `${props.y}px`,
        left: `${props.x}px`,
        transform: `rotate(${props.r}deg)`,
      }}
    >
      hi
    </div>
  );
};

const CanvasBackground = (props: { color: string }) => {
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none"
    >
      <defs>
        <pattern
          id="gridPattern"
          x="0"
          y="0"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16.5 0H15.5L15.5 2.06061C15.5 2.33675 15.7239 2.56061 16 2.56061C16.2761 2.56061 16.5 2.33675 16.5 2.06061V0ZM0 16.5V15.5L2.06061 15.5C2.33675 15.5 2.56061 15.7239 2.56061 16C2.56061 16.2761 2.33675 16.5 2.06061 16.5L0 16.5ZM16.5 32H15.5V29.9394C15.5 29.6633 15.7239 29.4394 16 29.4394C16.2761 29.4394 16.5 29.6633 16.5 29.9394V32ZM32 15.5V16.5L29.9394 16.5C29.6633 16.5 29.4394 16.2761 29.4394 16C29.4394 15.7239 29.6633 15.5 29.9394 15.5H32ZM5.4394 16C5.4394 15.7239 5.66325 15.5 5.93939 15.5H10.0606C10.3367 15.5 10.5606 15.7239 10.5606 16C10.5606 16.2761 10.3368 16.5 10.0606 16.5H5.9394C5.66325 16.5 5.4394 16.2761 5.4394 16ZM13.4394 16C13.4394 15.7239 13.6633 15.5 13.9394 15.5H15.5V13.9394C15.5 13.6633 15.7239 13.4394 16 13.4394C16.2761 13.4394 16.5 13.6633 16.5 13.9394V15.5H18.0606C18.3367 15.5 18.5606 15.7239 18.5606 16C18.5606 16.2761 18.3367 16.5 18.0606 16.5H16.5V18.0606C16.5 18.3367 16.2761 18.5606 16 18.5606C15.7239 18.5606 15.5 18.3367 15.5 18.0606V16.5H13.9394C13.6633 16.5 13.4394 16.2761 13.4394 16ZM21.4394 16C21.4394 15.7239 21.6633 15.5 21.9394 15.5H26.0606C26.3367 15.5 26.5606 15.7239 26.5606 16C26.5606 16.2761 26.3367 16.5 26.0606 16.5H21.9394C21.6633 16.5 21.4394 16.2761 21.4394 16ZM16 5.4394C16.2761 5.4394 16.5 5.66325 16.5 5.93939V10.0606C16.5 10.3367 16.2761 10.5606 16 10.5606C15.7239 10.5606 15.5 10.3368 15.5 10.0606V5.9394C15.5 5.66325 15.7239 5.4394 16 5.4394ZM16 21.4394C16.2761 21.4394 16.5 21.6633 16.5 21.9394V26.0606C16.5 26.3367 16.2761 26.5606 16 26.5606C15.7239 26.5606 15.5 26.3367 15.5 26.0606V21.9394C15.5 21.6633 15.7239 21.4394 16 21.4394Z"
            fill={props.color}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" x="0" y="0" fill="url(#gridPattern)" />
    </svg>
  );
};

"use client";
import { animated, useTransition } from "@react-spring/web";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CloseTiny } from "./Icons";

type Toast = {
  content: React.ReactNode;
  type: "info" | "error" | "success";
  duration?: number;
};

type Smoke = {
  position: { x: number; y: number };
  text: string;
  error?: boolean;
};

type Smokes = Array<Smoke & { key: string }>;

let PopUpContext = createContext({
  setSmokeState: (_f: (t: Smokes) => Smokes) => {},
  setToastState: (_t: Toast | null) => {},
});

export const useSmoker = () => {
  let { setSmokeState: setState } = useContext(PopUpContext);
  return (smoke: Smoke) => {
    let key = Date.now().toString();
    setState((smokes) => smokes.concat([{ ...smoke, key }]));
    setTimeout(() => {
      setState((smokes) => smokes.filter((t) => t.key !== key));
    }, 2000);
  };
};
export const useToaster = () => {
  let { setToastState: toaster } = useContext(PopUpContext);
  return toaster;
};
export const PopUpProvider: React.FC<React.PropsWithChildren<unknown>> = (
  props,
) => {
  let [state, setState] = useState<Smokes>([]);
  let [toastState, setToastState] = useState<Toast | null>(null);
  let toastTimeout = useRef<number | null>(null);
  let toaster = useCallback(
    (toast: Toast | null) => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
        toastTimeout.current = null;
      }
      setToastState(toast);
      toastTimeout.current = window.setTimeout(
        () => {
          setToastState(null);
        },
        toast?.duration ? toast.duration : 6000,
      );
    },
    [setToastState],
  );
  return (
    <PopUpContext.Provider
      value={{ setSmokeState: setState, setToastState: toaster }}
    >
      {props.children}
      {state.map((toast) => (
        <Smoke {...toast.position} error={toast.error} key={toast.key}>
          {toast.text}
        </Smoke>
      ))}
      <Toast toast={toastState} setToast={setToastState} />
    </PopUpContext.Provider>
  );
};

const Toast = (props: {
  toast: Toast | null;
  setToast: (t: Toast | null) => void;
}) => {
  let transitions = useTransition(props.toast ? [props.toast] : [], {
    from: { top: -40 },
    enter: { top: 8 },
    leave: { top: -40 },
    config: {
      mass: 8,
      friction: 150,
      tension: 2000,
    },
  });

  return transitions((style, item) => {
    return item ? (
      <animated.div
        style={style}
        className={`toastAnimationWrapper fixed bottom-0 right-0 left-0 z-50 h-fit`}
      >
        <div
          className={`toast absolute right-2 w-max  shadow-md px-3 py-1 flex flex-row gap-2 rounded-full border text-center ${
            props.toast?.type === "error"
              ? "bg-accent-red text-white border-white"
              : props.toast?.type === "success"
                ? "bg-accent-1 text-accent-2 border border-accent-2"
                : "bg-accent-1 text-accent-2 border border-accent-2"
          }`}
        >
          <div className="flex gap-2 grow justify-center">{item.content}</div>
          <button
            className="shrink-0"
            onClick={() => {
              props.setToast(null);
            }}
          >
            <CloseTiny />
          </button>
        </div>
      </animated.div>
    ) : null;
  });
};

const Smoke: React.FC<
  React.PropsWithChildren<{ x: number; y: number; error?: boolean }>
> = (props) => {
  return (
    <div
      className={`smoke text-center pointer-events-none absolute z-50 rounded-full px-2 py-1 text-sm  ${
        props.error
          ? "border-white bg-[#dc143c] text-white border font-bold"
          : "bg-accent-1 text-accent-2"
      }`}
    >
      <style jsx>{`
        .smoke {
          left: ${props.x}px;
          animation-name: fadeout;
          animation-duration: 2s;
        }

        @keyframes fadeout {
          from {
            top: ${props.y - 20}px;
            opacity: 100%;
          }

          to {
            top: ${props.y - 60}px;
            opacity: 0%;
          }
        }
      `}</style>
      {props.children}
    </div>
  );
};

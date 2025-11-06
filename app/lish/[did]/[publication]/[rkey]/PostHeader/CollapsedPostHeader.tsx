"use client";

import { Media } from "components/Media";
import {
  Interactions,
  useInteractionState,
} from "../Interactions/Interactions";
import { useState, useEffect } from "react";
import { Json } from "supabase/database.types";

// export const CollapsedPostHeader = (props: {
//   title: string;
//   pubIcon?: string;
//   quotes: { link: string; bsky_posts: { post_view: Json } | null }[];
// }) => {
//   let [headerVisible, setHeaderVisible] = useState(false);
//   let { drawerOpen: open } = useInteractionState();

//   useEffect(() => {
//     let post = window.document.getElementById("post-page");

//     function handleScroll() {
//       let postHeader = window.document
//         .getElementById("post-header")
//         ?.getBoundingClientRect();
//       if (postHeader && postHeader.bottom <= 0) {
//         setHeaderVisible(true);
//       } else {
//         setHeaderVisible(false);
//       }
//     }
//     post?.addEventListener("scroll", handleScroll);
//     return () => {
//       post?.removeEventListener("scroll", handleScroll);
//     };
//   }, []);
//   if (!headerVisible) return;
//   if (open) return;
//   return (
//     <Media
//       mobile
//       className="sticky top-0 left-0 right-0 w-full bg-bg-page border-b border-border-light -mx-3"
//     >
//       <div className="flex gap-2 items-center justify-between px-3 pt-2 pb-0.5 ">
//         <div className="text-tertiary font-bold text-sm truncate pr-1 grow">
//           {props.title}
//         </div>
//         <div className="flex gap-2 ">
//           <Interactions compact quotes={props.quotes.length} />
//           <div
//             style={{
//               backgroundRepeat: "no-repeat",
//               backgroundPosition: "center",
//               backgroundSize: "cover",
//               backgroundImage: `url(${props.pubIcon})`,
//             }}
//             className="shrink-0 w-4 h-4 rounded-full mt-[2px]"
//           />
//         </div>
//       </div>
//     </Media>
//   );
// };

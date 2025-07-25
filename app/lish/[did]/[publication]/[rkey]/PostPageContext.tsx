"use client";
import { createContext } from "react";
import { PostPageData } from "./getPostPageData";

export const PostPageContext = createContext<PostPageData>(null);

export const PostPageContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PostPageData;
}) => {
  return (
    <PostPageContext.Provider value={value}>
      {children}
    </PostPageContext.Provider>
  );
};

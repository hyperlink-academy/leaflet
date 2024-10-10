import { SelectionManager } from "components/SelectionManager";
import {
  ThemeProvider,
  ThemeBackgroundProvider,
} from "components/ThemeManager/ThemeProvider";
import { PopUpProvider } from "components/Toast";
import { AddLeafletToHomepage } from "components/utils/AddLeafletToHomepage";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";
import React from "react";
import { MessageComposer } from "./MessageComposer";
import { borderStyles } from "./borderStyles";

export default function BorderTest() {
  return (
    <PopUpProvider>
      <ThemeProvider entityID="123">
        <ThemeBackgroundProvider entityID="123">
          <div className="mx-auto h-screen w-fit py-12">
            <div className="flex flex-col gap-8 bg-bg-page border-border border rounded-lg h-full py-6 px-4 overflow-hidden overflow-y-scroll no-scrollbar">
              <MessageComposer />
              <Message
                borderStyle="custom"
                author="Breanna"
                message={
                  <div className="flex flex-col gap-2">
                    <div>
                      congrats the pouch’s code completeness!! But also, even
                      more congratulations on getting into stationary fest! Just
                      got my tickets for it so excited for the chance to buy
                      pouch and also meet you irl{" "}
                    </div>
                    <div>
                      while I loved the previous cover, the new cover rocks and
                      is a great intro to what pouch is all about (love the lil
                      dog)
                    </div>
                  </div>
                }
              />
              <Message
                borderStyle="none"
                author="lee"
                message={
                  <div>
                    CONGRATULATIONS!!! can't wait to see it irl! i also just
                    sent my press's first book to print this week, also through
                    mixam, i hope they are saying hi to each other as they pass
                    each other on the book conveyor belts (?)
                  </div>
                }
              />
              <Message
                borderStyle="sparkle"
                author="kelin"
                message={
                  <div className="flex flex-col gap-2">
                    <div>
                      congratulations!!! loved starting my morning reading this
                      💖 your excitement makes me want to have a great day!!
                    </div>
                    <div>
                      the new cover really achieves your goals so much better!
                      isn't it so satisfying to level up and redesign something
                      you made in the past??
                    </div>
                  </div>
                }
              />
              <Message
                borderStyle="shadow"
                author="Tiffany"
                message={
                  <div className="flex flex-col gap-2">
                    <div>
                      ove the new cover! very exciting that you'll be at
                      stationery fest!!
                    </div>

                    <div>
                      also, in case it's helpful – for color palettes, I've
                      found having the Riso color palette
                      (https://www.stencil.wiki/colors) in Procreate leads to
                      pleasing color combinations (:
                    </div>
                  </div>
                }
              />
              <Message
                borderStyle="wavy"
                author="JM Boots"
                message="woohoo!!! big congrats on getting into stationary fest especially!"
              />
            </div>
          </div>
        </ThemeBackgroundProvider>
      </ThemeProvider>
    </PopUpProvider>
  );
}

const Message = (props: {
  author: string;
  message: React.ReactNode;
  borderStyle: keyof typeof borderStyles;
}) => {
  let selectedSytle = borderStyles[props.borderStyle];
  return (
    <div className="message base relative w-[65ch]">
      <div className="w-full h-full" style={selectedSytle}>
        <div
          className={`
          messageAuthor
          py-0.5 px-2 absolute -top-3 left-2 
          text-tertiary text-sm font-bold italic 
          bg-bg-page  
          ${props.borderStyle === "none" ? "" : "border border-border rounded-full"}`}
        >
          {props.author}
        </div>
        <div
          className={`
          messageContent
          p-4 w-full 
          text-sm text-primary
          `}
        >
          {props.message}
        </div>
      </div>
    </div>
  );
};

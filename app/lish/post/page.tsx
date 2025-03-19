import Link from "next/link";
import { Footer } from "../Footer";

export default function Post() {
  return (
    <div className="postPage relative w-full h-screen items-stretch bg-bg-leaflet">
      <div className="h-full flex flex-col">
        <div
          id="post"
          className="post h-full overflow-scroll max-w-prose w-full p-4 mx-auto flex flex-col"
        >
          <Link href="./publication" className="hover:no-underline font-bold">
            Leaflet Explorers
          </Link>

          <h2 className="leading-tight">
            Bluesky post blocks and Make with Leaflet
          </h2>
          <small className="flex gap-3 text-tertiary italic pt-2">
            <div className="font-bold">Mar 6, 2025</div>
            <div>brendan</div>
          </small>
          <PostContent />
        </div>
        <Footer />
      </div>
    </div>
  );
}

const PostContent = () => {
  return (
    <pre className="whitespace-pre-wrap pt-8">
      {`Hi all, lots of Leaflet improvements in the past week or so!

Leaflet: now PWA-ified!
We made Leaflet work as a progressive web app (PWA) you can add on your phone, and it's really nice to use. To set it up:

visit leaflet.pub/home and log in

from mobile browser share, hit "add to home screen"

open with the app icon to use on your phone

Let us know what you think!

Explicit "add to home" button
If you visit the edit link of any doc you didn't create, you'll see a button to add it to your home. Very useful for things collaborators send you.

Docs you create still add to home automatically. But now, when you're logged in, you can remove and re-add docs as needed.

Button blocks
New block type — button — to configure a compellingly clickable CTA with custom text and destination link.

We're using this for some new landing pages we're making about ways to use Leaflet. See it in action here: make.leaflet.pub/events

screenshot from "make events with Leaflet" landing page, showing a section with three templates and a button to "make a blank Leaflet"
New block options
more alignment options: image, datetime, and button blocks can now be aligned the same way as text

full bleed images: a toggle for images to show with padding or extend to the edge of the page

You'll see these new options in the toolbar when the relevant blocks are selected.

Oh and finally, we simplified the share menu…let us know any thoughts if you notice a difference!

Leaflet WIP…
Have you tried using the RSVP block yet? If so we'd love to hear how it's working and if there are any ways we can make it better.

We're also thinking more about how we can improve 'home' for managing many docs, with things like search and tags/collections. What would your ideal Leaflet homepage look like?

And…exploring a few new block ideas! Would you use:

table blocks?

poll blocks?

product / payment blocks?

If so, hit reply, we'd love to hear about how!

Brendan / Jared / Celine
      `}
    </pre>
  );
};

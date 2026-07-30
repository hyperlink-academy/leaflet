import type { PubLeafletPagesLinearDocument } from "lexicons/api";

export const fakeBlocks: PubLeafletPagesLinearDocument.Block[] = [
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "Welcome to Leaflet, intrepid writer!",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "This is a place to write, blog, journal, and above all, express oneself. As such we take theming very seriously. Read on to discover how to make your wildest themes come true!",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: 'And now, for a horizontal rule (also known as a "divider")!',
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.horizontalRule",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 2,
      plaintext: "TLDR",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "We have some great presets available! Go ahead and apply one of those, and mess with the accent color to make it yours. Just keep in mind",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.unorderedList",
      children: [
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext: "Go for a nice bright accent ",
          },
        },
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext:
              "Make sure the text on accent is still legible. White or black if you're not sure!",
          },
        },
      ],
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.horizontalRule",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 2,
      plaintext: "Your Text",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 3,
      plaintext: "Text",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "This is your default text color. ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "We also mix it with your background color to make lighter text or border colors!",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "No need to think too hard, black or white is good! Just make sure it shows up strong against your background color. ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 3,
      plaintext: "Accent Colors ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      facets: [
        {
          index: {
            byteEnd: 32,
            byteStart: 20,
          },
          features: [
            {
              uri: "https://leaflet.pub/about",
              $type: "pub.leaflet.richtext.facet#link",
            },
          ],
        },
      ],
      plaintext:
        "We use this in your inline links, and in certain block types like...",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      url: "https://www.leaflet.pub/about",
      text: "Buttons!",
      $type: "pub.leaflet.blocks.button",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "Pick something... ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.unorderedList",
      children: [
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext: "nice and bright",
          },
        },
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext:
              "with legible text on accent (white usually works, but sometimes black shows up better) ",
          },
        },
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext: "that shows off your personality!",
          },
        },
      ],
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.horizontalRule",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 2,
      plaintext: "Your Background",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 3,
      plaintext: "Background",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "This is your background color. It can also be an image!",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "If you decide to go for a solid background color...",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.unorderedList",
      children: [
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext: "pick one that isn't too vibrant",
          },
        },
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext: "go either dark or light, not in the middle",
          },
        },
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext:
              "try a very dark or very light version of your accent color",
          },
        },
      ],
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "If you go for an image, it's easy to overwhelm a reader with too much, so pick one that's... ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.unorderedList",
      children: [
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext:
              'not distracting. ie, not colorful or busy. You want something that could be described as "kinda boring". It\'ll still give a lot of personality once you apply it!',
          },
        },
        {
          $type: "pub.leaflet.blocks.unorderedList#listItem",
          content: {
            $type: "pub.leaflet.blocks.text",
            plaintext: "Gradients are a classy classic",
          },
        },
      ],
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 3,
      plaintext: "Page or Container",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "You can choose to have a page background or not. ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "Page background puts a box around your writing. It's especially useful if you have a background image making your text harder to read. It's also another place to inject a color to give your writing some zuzsh.",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "No page background looks clean and minimal. It's sup to you!",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.horizontalRule",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.header",
      level: 2,
      plaintext: "Stuck?",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext:
        "If you're really stuck, try one of our preset themes! Change just the accent color to give it a more personal flair. ",
    },
  },
  {
    $type: "pub.leaflet.pages.linearDocument#block",
    block: {
      $type: "pub.leaflet.blocks.text",
      plaintext: "Good luck!",
    },
  },
];

export const fakePage: PubLeafletPagesLinearDocument.Main = {
  $type: "pub.leaflet.pages.linearDocument",
  id: "preview-page",
  blocks: fakeBlocks,
};

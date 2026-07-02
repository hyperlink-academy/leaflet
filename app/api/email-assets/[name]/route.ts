import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Path data mirrors `components/Icons/QuoteTiny.tsx` and
// `components/Icons/CommentTiny.tsx`. The icon components use
// `fill="currentColor"` for the web; here we bake the color in directly so
// the rendered PNG carries the resolved theme color. If the source icons
// are restyled, update these in lockstep.
const ICONS: Record<
  string,
  { viewBox: string; svg: (color: string) => string }
> = {
  quote: {
    viewBox: "0 0 16 16",
    svg: (color) =>
      `<path fill="${color}" d="M9.84587 5.33561C11.4619 3.15425 14.3417 3.39636 14.3019 3.74771C14.2657 4.05794 13.4971 3.76588 12.3615 5.03971C11.7289 5.74932 11.6203 6.37868 11.5783 7.20182C12.1527 7.41881 13.2423 7.831 13.4601 8.27603C13.7073 8.72447 13.7967 9.24437 13.7277 9.83561L13.6545 10.4567C13.5647 11.2256 13.269 11.8358 12.7668 12.2868C12.2974 12.7117 11.5893 12.8689 10.6427 12.7585C9.69636 12.6479 9.02919 12.3303 8.64079 11.8053C8.2854 11.2542 8.15259 10.5939 8.24235 9.82486L8.31462 9.20377C8.45622 7.99116 8.96691 6.70195 9.84587 5.33561ZM3.32829 3.56314C4.94416 1.38205 7.82349 1.62396 7.78435 1.97525C7.74814 2.28548 6.9795 1.99346 5.84392 3.26725C5.21135 3.97685 5.10275 4.60622 5.06071 5.42936C5.63514 5.64634 6.72474 6.05852 6.94255 6.50357C7.1898 6.95201 7.27907 7.4719 7.21013 8.06314L7.13786 8.68424C7.0481 9.45328 6.75156 10.0643 6.24919 10.5153C5.77985 10.9401 5.07152 11.0974 4.12517 10.987C3.17876 10.8765 2.51162 10.5579 2.12321 10.0329C1.76788 9.48173 1.63502 8.82138 1.72478 8.0524L1.79704 7.43131C1.93867 6.21872 2.44934 4.92946 3.32829 3.56314Z"/>`,
  },
  comment: {
    viewBox: "0 0 16 16",
    svg: (color) =>
      `<path fill-rule="evenodd" clip-rule="evenodd" fill="${color}" d="M13.2729 2.64811C12.2701 1.70568 10.6421 1.18237 8.1478 1.18237C6.39426 1.18237 4.77702 1.50266 3.59413 2.35686C2.40039 3.2189 1.67651 4.60444 1.67651 6.66696C1.67651 7.88721 2.1903 9.10636 3.31693 10.0167C4.44114 10.9251 6.16141 11.5153 8.56098 11.5153C9.08508 11.5153 9.60084 11.4629 10.0969 11.3613C10.5398 11.6928 11.083 12.0262 11.6403 12.2074C12.7152 12.5567 13.7185 12.3275 14.1019 12.1609C14.1019 12.1609 14.2711 12.1295 14.2741 11.8717C14.2766 11.6522 14.1019 11.5896 14.1019 11.5896C13.926 11.5083 13.6469 11.1801 13.5349 10.8816L13.5248 10.8546C13.3259 10.3243 13.2725 10.182 13.2725 9.65473C14.1019 9.1196 14.6191 8.12643 14.6191 6.45488C14.6191 4.92613 14.2789 3.59362 13.2729 2.64811ZM8.93574 3.76256L8.70323 5.91493L10.9354 5.30957L11.0981 6.34091L8.95899 6.50907L10.3425 8.28028L9.34264 8.80716L8.35446 6.84537L7.45928 8.80716L6.42459 8.28028L7.7848 6.50907L5.66892 6.34091L5.83168 5.30957L8.04056 5.91493L7.79642 3.76256H8.93574ZM1.97489 11.1316C1.78179 10.9342 1.78529 10.6176 1.98269 10.4246C2.18009 10.2315 2.49666 10.2349 2.68975 10.4324C3.92379 11.6939 5.73209 12.3694 8.36317 12.3694C8.83898 12.3694 9.30531 12.3214 9.7503 12.2291L9.96768 12.1841L10.1469 12.3151C10.5457 12.6067 11.0144 12.883 11.4665 13.0234C12.3294 13.2916 13.2154 13.2513 13.9249 13.0246C14.1879 12.9406 14.4693 13.0857 14.5533 13.3488C14.6374 13.6118 14.4923 13.8932 14.2292 13.9772C13.3347 14.263 12.2387 14.3105 11.1698 13.9784C10.6483 13.8164 10.1492 13.5339 9.73648 13.25C9.29041 13.3289 8.82988 13.3694 8.36317 13.3694C5.56006 13.3694 3.45551 12.6453 1.97489 11.1316Z"/>`,
  },
};

// Allow rgb()/rgba()/#hex/named CSS colors. Reject anything that could
// break out of the SVG attribute (quotes, angle brackets, backslashes).
const sanitizeColor = (input: string): string => {
  if (input.length > 64) return "rgb(0, 0, 0)";
  if (/[<>"'\\]/.test(input)) return "rgb(0, 0, 0)";
  return input;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name: rawName } = await params;
  const name = rawName.replace(/\.png$/, "");
  const icon = ICONS[name];
  if (!icon) return new NextResponse(null, { status: 404 });

  const { searchParams } = req.nextUrl;
  const color = sanitizeColor(searchParams.get("color") ?? "rgb(0, 0, 0)");
  const sizeParam = parseInt(searchParams.get("size") ?? "16", 10);
  const displaySize =
    Number.isFinite(sizeParam) && sizeParam > 0
      ? Math.min(128, Math.max(8, sizeParam))
      : 16;
  // Render at 2x so Retina mail clients (Apple Mail) stay crisp when the
  // <img> displays at `displaySize`.
  const renderSize = displaySize * 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderSize}" height="${renderSize}" viewBox="${icon.viewBox}">${icon.svg(color)}</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      // URL fully identifies the rendering (name + color + size), so the
      // response is content-addressed — safe to cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "s-maxage=31536000, immutable",
    },
  });
}

// The only output widths the image-resizing proxies will produce. Off-ladder
// requests are snapped up to the nearest entry (and capped at the largest)
// rather than rejected: dimensions are caller-controlled and each distinct
// value mints a permanent stored variant, so without snapping an
// unauthenticated caller could fill storage with thousands of variants per
// image — while rejecting would break URLs already living in edge and browser
// caches. 360/800 are the app's cover-thumbnail widths (COVER_THUMBNAIL_WIDTH),
// 1200 covers document-body images at retina density (~600px column × 2), and
// 2000 is the existing hard cap for full-size use.
const IMAGE_WIDTHS = [360, 800, 1200, 2000];

/** @param {number} width */
function snapToImageWidth(width) {
  return (
    IMAGE_WIDTHS.find((w) => w >= width) ??
    IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]
  );
}

module.exports = { IMAGE_WIDTHS, snapToImageWidth };

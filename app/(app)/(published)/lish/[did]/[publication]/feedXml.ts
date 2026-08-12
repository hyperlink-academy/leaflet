// Post-processing for the RSS XML the feed library emits. Post content lives
// in CDATA sections; these rewrites only apply to the XML structure around
// them.
function mapOutsideCdata(xml: string, fn: (part: string) => string): string {
  return xml
    .split(/(<!\[CDATA\[[\s\S]*?\]\]>)/)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join("");
}

// The feed library pretty-prints, leaving `<link>url</link>` followed by a
// newline and indentation. `<link>` is a void element in HTML, so consumers
// that parse RSS with an HTML parser drop the closing tag and read the URL
// merged with the trailing indentation — then request paths like
// "/{rkey}%0A%20%20...". Collapsing inter-tag whitespace leaves those
// parsers a clean URL.
export function collapseInterTagWhitespace(xml: string): string {
  return mapOutsideCdata(xml, (part) => part.replace(/>\s+</g, "><"));
}

// The feed library stamps isPermaLink="false" on every guid it's given an id
// for, but our guids are the posts' permalink URLs — readers should treat
// them as such (and isPermaLink="true" is the RSS 2.0 default, so the
// attribute can drop entirely).
export function markGuidsAsPermalinks(xml: string): string {
  return mapOutsideCdata(xml, (part) =>
    part.replaceAll('<guid isPermaLink="false">', "<guid>"),
  );
}

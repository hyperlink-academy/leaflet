// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { parseWordpressExport } from "./parseWordpressExport";

const item = (fields: string) => `<item>${fields}</item>`;
const wxr = (items: string) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>My blog</title>
  <link>https://blog.example.com</link>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>https://blog.example.com</wp:base_site_url>
  <wp:base_blog_url>https://blog.example.com</wp:base_blog_url>
  ${items}
</channel>
</rss>`;

const post = (o: {
  id: string;
  type?: string;
  status?: string;
  slug?: string;
  date?: string;
  dateGmt?: string;
  html?: string;
  password?: string;
  extra?: string;
}) =>
  item(`
    <title><![CDATA[Post ${o.id}]]></title>
    <link>https://blog.example.com/${o.slug ?? `post-${o.id}`}/</link>
    <guid isPermaLink="false">https://blog.example.com/?p=${o.id}</guid>
    <content:encoded><![CDATA[${o.html ?? "<p>Body</p>"}]]></content:encoded>
    <excerpt:encoded><![CDATA[]]></excerpt:encoded>
    <wp:post_id>${o.id}</wp:post_id>
    <wp:post_date><![CDATA[${o.date ?? "2025-07-08 14:30:00"}]]></wp:post_date>
    <wp:post_date_gmt><![CDATA[${o.dateGmt ?? "2025-07-08 12:30:00"}]]></wp:post_date_gmt>
    <wp:post_name><![CDATA[${o.slug ?? `post-${o.id}`}]]></wp:post_name>
    <wp:status><![CDATA[${o.status ?? "publish"}]]></wp:status>
    <wp:post_type><![CDATA[${o.type ?? "post"}]]></wp:post_type>
    <wp:post_password><![CDATA[${o.password ?? ""}]]></wp:post_password>
    ${o.extra ?? ""}`);

const attachment = (id: string, url: string, size = "") =>
  item(`
    <wp:post_id>${id}</wp:post_id>
    <wp:status><![CDATA[inherit]]></wp:status>
    <wp:post_type><![CDATA[attachment]]></wp:post_type>
    <wp:attachment_url><![CDATA[${url}]]></wp:attachment_url>
    <wp:postmeta>
      <wp:meta_key><![CDATA[_wp_attachment_metadata]]></wp:meta_key>
      <wp:meta_value><![CDATA[${size}]]></wp:meta_value>
    </wp:postmeta>`);

describe("parseWordpressExport", () => {
  test("reads the site and its posts and pages, oldest first", () => {
    const ex = parseWordpressExport(
      wxr(
        post({ id: "2", dateGmt: "2026-01-01 00:00:00" }) +
          post({ id: "1", type: "page", slug: "about" }) +
          post({ id: "3", type: "nav_menu_item" }) +
          post({ id: "4", status: "trash" }) +
          post({ id: "5", status: "auto-draft" }),
      ),
    );
    expect(ex.siteTitle).toBe("My blog");
    expect(ex.siteUrl).toBe("https://blog.example.com");
    expect(ex.posts.map((p) => [p.id, p.type, p.slug])).toEqual([
      ["1", "page", "about"],
      ["2", "post", "post-2"],
    ]);
    expect(ex.posts[0]).toMatchObject({
      title: "Post 1",
      status: "publish",
      date: "2025-07-08T12:30:00.000Z",
      link: "https://blog.example.com/about/",
      guid: "https://blog.example.com/?p=1",
      html: "<p>Body</p>",
    });
  });

  test("drafts without a GMT date or slug fall back to the local date and id", () => {
    const ex = parseWordpressExport(
      wxr(
        post({
          id: "7",
          status: "draft",
          slug: "",
          dateGmt: "0000-00-00 00:00:00",
          date: "2025-05-01 09:00:00",
        }),
      ),
    );
    expect(ex.posts[0]).toMatchObject({
      slug: "7",
      date: "2025-05-01T09:00:00.000Z",
    });
  });

  test("categories then tags, without Uncategorized or duplicates", () => {
    const ex = parseWordpressExport(
      wxr(
        post({
          id: "1",
          extra: `
            <category domain="post_tag" nicename="miso"><![CDATA[Miso]]></category>
            <category domain="category" nicename="uncategorized"><![CDATA[Uncategorized]]></category>
            <category domain="category" nicename="foodie"><![CDATA[Foodie]]></category>
            <category domain="post_tag" nicename="foodie"><![CDATA[foodie]]></category>`,
        }),
      ),
    );
    expect(ex.posts[0].tags).toEqual(["Foodie", "Miso"]);
  });

  test("resolves the featured image and the attachments the body uses", () => {
    const ex = parseWordpressExport(
      wxr(
        attachment(
          "11",
          "https://blog.example.com/wp-content/uploads/a.png",
          'a:6:{s:5:"width";i:750;s:6:"height";i:1000;s:4:"file";s:5:"a.png";s:5:"sizes";a:1:{s:6:"medium";a:3:{s:4:"file";s:13:"a-225x300.png";s:5:"width";i:225;s:6:"height";i:300;}}}',
        ) +
          attachment(
            "12",
            "https://blog.example.com/wp-content/uploads/b.png",
          ) +
          attachment(
            "13",
            "https://blog.example.com/wp-content/uploads/c.png",
          ) +
          post({
            id: "1",
            html: `<img src="https://blog.example.com/wp-content/uploads/a-225x300.png" class="wp-image-11"/>[gallery ids="12, 13"]`,
            extra: `<wp:postmeta><wp:meta_key><![CDATA[_thumbnail_id]]></wp:meta_key><wp:meta_value><![CDATA[11]]></wp:meta_value></wp:postmeta>`,
          }),
      ),
    );
    const p = ex.posts[0];
    expect(p.featureImage).toEqual({
      url: "https://blog.example.com/wp-content/uploads/a.png",
      width: 750,
      height: 1000,
    });
    expect(Object.keys(p.attachments).sort()).toEqual(["11", "12", "13"]);
    expect(p.attachments["12"]).toEqual({
      url: "https://blog.example.com/wp-content/uploads/b.png",
      width: null,
      height: null,
    });
  });

  test("password-protected posts are flagged", () => {
    const ex = parseWordpressExport(
      wxr(post({ id: "1", password: "hunter2" }) + post({ id: "2" })),
    );
    expect(ex.posts.map((p) => p.passwordProtected)).toEqual([true, false]);
  });

  test("rejects files that aren't WXR", () => {
    expect(() => parseWordpressExport("{}")).toThrow(/valid XML/);
    expect(() =>
      parseWordpressExport(`<rss><channel><title>x</title></channel></rss>`),
    ).toThrow(/WXR/);
  });
});

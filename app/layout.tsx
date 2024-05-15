import "./globals.css";
export const metadata = {
  title: "Minilink",
  description: "tiny interconnected social documents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

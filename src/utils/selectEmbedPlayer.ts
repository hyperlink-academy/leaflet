const isHlsPlaylist = (player: { href: string; type: string }) =>
  /mpegurl/i.test(player.type) || /\.m3u8($|\?)/i.test(player.href);

export function selectEmbedPlayer<T extends { href: string; type: string }>(
  players: T[] | undefined,
): T | undefined {
  return (
    players?.find((player) => player.type.startsWith("text/html")) ??
    players?.find((player) => !isHlsPlaylist(player))
  );
}

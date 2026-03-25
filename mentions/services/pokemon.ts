type Result = { uri: string; name: string; href?: string };

let cachedPokemon: { name: string; url: string }[] | null = null;

async function getAllPokemon() {
  if (cachedPokemon) return cachedPokemon;
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1302");
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results: { name: string; url: string }[];
  };
  cachedPokemon = data.results;
  return cachedPokemon;
}

function formatName(name: string) {
  return name
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export async function pokemon(search: string, limit: number): Promise<Result[]> {
  if (!search.trim()) return [];

  const allPokemon = await getAllPokemon();
  const query = search.toLowerCase();

  return allPokemon
    .filter((p) => p.name.includes(query))
    .slice(0, limit)
    .map((p) => ({
      uri: `pokemon:${p.name}`,
      name: formatName(p.name),
      href: `https://pokemondb.net/pokedex/${p.name}`,
    }));
}

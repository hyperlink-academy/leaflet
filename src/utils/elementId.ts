export const elementId = {
  block: (id: string) => ({
    text: `block/${id}/content`,
    container: `block/${id}/container`,
  }),
  card: (id: string) => ({
    container: `card/${id}/container`,
  }),
};

export const elementId = {
  block: (id: string) => ({
    text: `block/${id}/content`,
    container: `block/${id}/container`,
  }),
  page: (id: string) => ({
    container: `card/${id}/container`,
  }),
};

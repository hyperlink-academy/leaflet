export const elementId = {
  block: (id: string) => ({
    text: `block/${id}/content`,
    container: `block/${id}/container`,
    input: `block/${id}/input`,
  }),
  page: (id: string) => ({
    container: `page/${id}/container`,
    canvasScrollArea: `page/${id}/canvasScrollArea`,
  }),
};

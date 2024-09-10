export const elementId = {
  block: (id: string) => ({
    text: `block/${id}/content`,
    container: `block/${id}/container`,
  }),
  page: (id: string) => ({
    container: `page/${id}/container`,
    canvasScrollArea: `page/${id}/canvasScrollArea`,
  }),
};

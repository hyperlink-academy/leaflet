export const elementId = {
  block: (id: string) => ({
    text: `block/${id}/content`,
    container: `block/${id}/container`,
    input: `block/${id}/input`,
    pollInput: (entity: string) => `block/${id}/poll-input/${entity}`,
  }),
  page: (id: string) => ({
    container: `page/${id}/container`,
    canvasScrollArea: `page/${id}/canvasScrollArea`,
  }),
};

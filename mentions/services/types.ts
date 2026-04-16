export type MentionResult = {
  uri: string;
  name: string;
  href?: string;
  icon?: string;
  embed?: {
    src: string;
    width?: number;
    height?: number;
  };
};

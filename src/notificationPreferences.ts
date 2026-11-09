import { z } from "zod";
import { digestFrequencyValues } from "src/digests/frequencies";

// Each notification type declares its own valid delivery frequencies.
export const notificationPreferenceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("digest"),
    frequency: z.enum(["off", ...digestFrequencyValues]),
  }),
  z.object({
    type: z.literal("comments"),
    frequency: z.enum(["off", "instant"]),
  }),
]);

export type NotificationPreference = z.infer<
  typeof notificationPreferenceSchema
>;
export type NotificationPreferences = {
  [Type in NotificationPreference["type"]]: Extract<
    NotificationPreference,
    { type: Type }
  >["frequency"];
};

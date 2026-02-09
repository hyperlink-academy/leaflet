---
name: notifications
description: Reference for the notification system. Use when adding new notification types or modifying notification handling.
user-invocable: false
---

# Notification System

## Overview

Notifications are stored in the database and hydrated with related data before being rendered. The system supports multiple notification types (comments, subscriptions, etc.) that are processed in parallel.

## Key Files

- **`src/notifications.ts`** - Core notification types and hydration logic
- **`app/(home-pages)/notifications/NotificationList.tsx`** - Renders all notification types
- **`app/(home-pages)/notifications/Notification.tsx`** - Base notification component
- Individual notification components (e.g., `CommentNotification.tsx`, `FollowNotification.tsx`)

## Adding a New Notification Type

### 1. Update Notification Data Types (`src/notifications.ts`)

Add your type to the `NotificationData` union:

```typescript
export type NotificationData =
  | { type: "comment"; comment_uri: string; parent_uri?: string }
  | { type: "subscribe"; subscription_uri: string }
  | { type: "your_type"; your_field: string }; // Add here
```

Add to the `HydratedNotification` union:

```typescript
export type HydratedNotification =
  | HydratedCommentNotification
  | HydratedSubscribeNotification
  | HydratedYourNotification; // Add here
```

### 2. Create Hydration Function (`src/notifications.ts`)

```typescript
export type HydratedYourNotification = Awaited<
  ReturnType<typeof hydrateYourNotifications>
>[0];

async function hydrateYourNotifications(notifications: NotificationRow[]) {
  const yourNotifications = notifications.filter(
    (n): n is NotificationRow & { data: ExtractNotificationType<"your_type"> } =>
      (n.data as NotificationData)?.type === "your_type",
  );

  if (yourNotifications.length === 0) return [];

  // Fetch related data with joins
  const { data } = await supabaseServerClient
    .from("your_table")
    .select("*, related_table(*)")
    .in("uri", yourNotifications.map((n) => n.data.your_field));

  return yourNotifications.map((notification) => ({
    id: notification.id,
    recipient: notification.recipient,
    created_at: notification.created_at,
    type: "your_type" as const,
    your_field: notification.data.your_field,
    yourData: data?.find((d) => d.uri === notification.data.your_field)!,
  }));
}
```

Add to `hydrateNotifications` parallel array:

```typescript
const [commentNotifications, subscribeNotifications, yourNotifications] = await Promise.all([
  hydrateCommentNotifications(notifications),
  hydrateSubscribeNotifications(notifications),
  hydrateYourNotifications(notifications), // Add here
]);

const allHydrated = [...commentNotifications, ...subscribeNotifications, ...yourNotifications];
```

### 3. Trigger the Notification (in your action file)

```typescript
import { Notification, pingIdentityToUpdateNotification } from "src/notifications";
import { v7 } from "uuid";

// When the event occurs:
const recipient = /* determine who should receive it */;
if (recipient !== currentUser) {
  const notification: Notification = {
    id: v7(),
    recipient,
    data: {
      type: "your_type",
      your_field: "value",
    },
  };
  await supabaseServerClient.from("notifications").insert(notification);
  await pingIdentityToUpdateNotification(recipient);
}
```

### 4. Create Notification Component

Create a new component (e.g., `YourNotification.tsx`):

```typescript
import { HydratedYourNotification } from "src/notifications";
import { Notification } from "./Notification";

export const YourNotification = (props: HydratedYourNotification) => {
  // Extract data from props.yourData

  return (
    <Notification
      timestamp={props.created_at}
      href={/* link to relevant page */}
      icon={/* icon or avatar */}
      actionText={<>Message to display</>}
      content={/* optional additional content */}
    />
  );
};
```

### 5. Update NotificationList (`NotificationList.tsx`)

Import and render your notification type:

```typescript
import { YourNotification } from "./YourNotification";

// In the map function:
if (n.type === "your_type") {
  return <YourNotification key={n.id} {...n} />;
}
```

## Example: Subscribe Notifications

See the implementation in:
- `src/notifications.ts:88-125` - Hydration logic
- `app/lish/subscribeToPublication.ts:55-68` - Trigger
- `app/(home-pages)/notifications/FollowNotification.tsx` - Component
- `app/(home-pages)/notifications/NotificationList.tsx:40-42` - Rendering


import { Link } from "wouter";
import { Bell } from "lucide-react";
import { useUser } from "@clerk/react";

import { useSupportNotifications } from "@/hooks/use-support";

export function NotificationBell() {
  const { isLoaded, isSignedIn } = useUser();

  const { data: notifications = [] } =
    useSupportNotifications(isLoaded && isSignedIn === true);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
      title="Notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted"
    >
      <Bell className="h-5 w-5 text-foreground" />

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

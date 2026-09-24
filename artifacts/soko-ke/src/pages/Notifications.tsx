
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Bell, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { ShopLayout } from "@/components/layout/ShopLayout";
import { Button } from "@/components/ui/button";

import {
  useSupportNotifications,
  useMarkNotificationRead,
  type SupportNotification,
} from "@/hooks/use-support";

import { useMarketplaceMe } from "@/hooks/use-marketplace";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function NotificationsPage() {
  const [, navigate] = useLocation();

  const { isLoaded, isSignedIn } = useUser();

  const { data: me } = useMarketplaceMe();

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useSupportNotifications(
    isLoaded && isSignedIn === true,
  );

  const markRead = useMarkNotificationRead();

  const isAdmin = me?.role === "platform_admin";

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  function notificationDestination(
    notification: SupportNotification,
  ) {
    if (notification.ticketId === null) {
      return isAdmin
        ? "/admin/support"
        : "/support/tickets";
    }

    return isAdmin
      ? `/admin/support/${notification.ticketId}`
      : `/support/tickets/${notification.ticketId}`;
  }

  async function openNotification(
    notification: SupportNotification,
  ) {
    try {
      if (!notification.isRead) {
        await markRead.mutateAsync(notification.id);
      }

      navigate(notificationDestination(notification));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open notification",
      );
    }
  }

  async function markNotificationRead(
    notification: SupportNotification,
  ) {
    if (notification.isRead) {
      return;
    }

    try {
      await markRead.mutateAsync(notification.id);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to mark notification as read",
      );
    }
  }

  return (
    <ShopLayout>
      <main className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Your account
            </p>

            <h1 className="mt-2 font-serif text-3xl font-bold">
              Notifications
            </h1>

            <p className="mt-3 text-muted-foreground">
              Ticket updates and messages from SokoKE Support.
            </p>
          </div>

          {isSignedIn && (
            <span className="rounded-full bg-muted px-4 py-2 text-sm font-medium">
              {unreadCount} unread
            </span>
          )}
        </div>

        {!isLoaded && (
          <p className="mt-8 text-muted-foreground">
            Loading your account...
          </p>
        )}

        {isLoaded && !isSignedIn && (
          <div className="mt-8 rounded-2xl border bg-card p-8">
            <Bell className="h-8 w-8 text-primary" />

            <h2 className="mt-4 text-xl font-semibold">
              Sign in to view notifications
            </h2>

            <p className="mt-2 text-muted-foreground">
              Your notifications are linked to your SokoKE account.
            </p>

            <Link href="/sign-in">
              <Button className="mt-6">
                Sign in
              </Button>
            </Link>
          </div>
        )}

        {isSignedIn && isLoading && (
          <p className="mt-8 text-muted-foreground">
            Loading notifications...
          </p>
        )}

        {isSignedIn && error && (
          <div className="mt-8 rounded-xl border p-6">
            <p className="text-destructive">
              {error.message}
            </p>
          </div>
        )}

        {isSignedIn &&
          !isLoading &&
          !error &&
          notifications.length === 0 && (
            <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground" />

              <h2 className="mt-4 text-xl font-semibold">
                You're all caught up
              </h2>

              <p className="mt-2 text-muted-foreground">
                Ticket updates and support messages will
                appear here.
              </p>
            </div>
          )}

        <div className="mt-8 space-y-3">
          {isSignedIn &&
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-5 transition-colors ${
                  notification.isRead
                    ? "bg-card"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-semibold">
                        {notification.title}
                      </h2>

                      {!notification.isRead && (
                        <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {notification.message}
                    </p>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        onClick={() =>
                          void openNotification(notification)
                        }
                        disabled={markRead.isPending}
                      >
                        View ticket
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void markNotificationRead(
                              notification,
                            )
                          }
                          disabled={markRead.isPending}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </main>
    </ShopLayout>
  );
}

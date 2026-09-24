
import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Send,
  Ticket,
} from "lucide-react";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  useAdminSupportTickets,
  useReplyToTicket,
  useSupportTicket,
  useUpdateTicketStatus,
  type TicketStatus,
} from "@/hooks/use-support";

const statuses: {
  value: TicketStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: TicketStatus) {
  return (
    statuses.find((item) => item.value === status)?.label ??
    status
  );
}

export function AdminSupport() {
  const [filter, setFilter] = useState<TicketStatus | "all">(
    "all",
  );

  const {
    data: tickets = [],
    isLoading,
    error,
  } = useAdminSupportTickets(
    filter === "all" ? undefined : filter,
  );

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Customer service
          </p>

          <h1 className="mt-2 font-serif text-3xl font-bold">
            Support tickets
          </h1>

          <p className="mt-2 text-muted-foreground">
            Review customer enquiries and manage support
            conversations.
          </p>
        </div>

        <div className="rounded-lg border bg-card px-4 py-3 text-sm">
          <span className="font-semibold">
            {tickets.length}
          </span>{" "}
          {filter === "all" ? "total tickets" : "matching tickets"}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>

        {statuses.map((status) => (
          <Button
            key={status.value}
            variant={
              filter === status.value ? "default" : "outline"
            }
            onClick={() => setFilter(status.value)}
          >
            {status.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <p className="mt-8 text-muted-foreground">
          Loading support tickets...
        </p>
      )}

      {error && (
        <p className="mt-8 text-destructive">
          {error.message}
        </p>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <div className="mt-8 rounded-xl border bg-card p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-semibold">
            No tickets found
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Tickets matching the selected filter will appear
            here.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/admin/support/${ticket.id}`}
            className="block rounded-xl border bg-card p-5 transition-colors hover:border-primary"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">
                  {ticket.reference}
                </p>

                <h2 className="mt-2 break-words text-lg font-semibold">
                  {ticket.subject}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {ticket.category} · Updated{" "}
                  {formatDate(ticket.updatedAt)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {statusLabel(ticket.status)}
                </span>

                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}

export function AdminSupportDetail() {
  const params = useParams();
  const id = Number(params.id);

  const [, navigate] = useLocation();

  const {
    data,
    isLoading,
    error,
  } = useSupportTicket(id);

  const reply = useReplyToTicket(id);
  const updateStatus = useUpdateTicketStatus(id);

  const [message, setMessage] = useState("");

  async function handleReply(event: FormEvent) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    try {
      await reply.mutateAsync(message.trim());
      setMessage("");
      toast.success("Reply sent");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send reply",
      );
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    try {
      await updateStatus.mutateAsync(status);
      toast.success(
        `Ticket status updated to ${statusLabel(status)}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update ticket status",
      );
    }
  }

  return (
    <AdminLayout>
      <button
        type="button"
        onClick={() => navigate("/admin/support")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to support tickets
      </button>

      {isLoading && (
        <p className="mt-8 text-muted-foreground">
          Loading ticket...
        </p>
      )}

      {error && (
        <div className="mt-8 rounded-xl border bg-card p-6">
          <h1 className="text-xl font-semibold">
            Unable to load ticket
          </h1>

          <p className="mt-2 text-muted-foreground">
            {error.message}
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="mt-7 rounded-xl border bg-card p-6">
            <p className="text-sm font-semibold text-primary">
              {data.ticket.reference}
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold">
              {data.ticket.subject}
            </h1>

            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>Category: {data.ticket.category}</p>

              <p>
                Created: {formatDate(data.ticket.createdAt)}
              </p>

              <p>
                Customer ID: {data.ticket.ownerClerkId}
              </p>

              {data.ticket.orderReference && (
                <p>
                  Order reference:{" "}
                  {data.ticket.orderReference}
                </p>
              )}
            </div>

            <div className="mt-6 border-t pt-5">
              <label
                htmlFor="admin-ticket-status"
                className="block text-sm font-semibold"
              >
                Ticket status
              </label>

              <select
                id="admin-ticket-status"
                value={data.ticket.status}
                disabled={updateStatus.isPending}
                onChange={(event) =>
                  void handleStatusChange(
                    event.target.value as TicketStatus,
                  )
                }
                className="mt-2 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {statuses.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="mt-6 rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />

              <h2 className="text-lg font-semibold">
                Conversation
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              {data.messages.map((item) => {
                const fromSupport =
                  item.authorRole === "platform_admin";

                return (
                  <div
                    key={item.id}
                    className={`flex ${
                      fromSupport
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl p-4 md:max-w-[75%] ${
                        fromSupport
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="mb-2 text-xs font-semibold opacity-75">
                        {fromSupport
                          ? "SokoKE Support"
                          : "Customer"}
                      </p>

                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {item.body}
                      </p>

                      <p className="mt-3 text-xs opacity-70">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {data.ticket.status === "closed" ? (
              <div className="mt-8 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                This ticket is closed. Change its status
                to reopen the conversation.
              </div>
            ) : (
              <form
                onSubmit={handleReply}
                className="mt-8 space-y-3 border-t pt-6"
              >
                <label
                  htmlFor="admin-ticket-reply"
                  className="text-sm font-semibold"
                >
                  Reply to customer
                </label>

                <Textarea
                  id="admin-ticket-reply"
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  maxLength={10000}
                  rows={5}
                  required
                  placeholder="Write your response..."
                />

                <Button
                  type="submit"
                  disabled={reply.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />

                  {reply.isPending
                    ? "Sending..."
                    : "Send reply"}
                </Button>
              </form>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}

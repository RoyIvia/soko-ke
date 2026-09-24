
import { useState, type FormEvent } from "react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Headset,
  MessageSquare,
  Plus,
  Send,
  Ticket,
} from "lucide-react";

import { ShopLayout } from "@/components/layout/ShopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  useCreateSupportTicket,
  useMyTickets,
  useReplyToTicket,
  useSupportTicket,
  type TicketCategory,
  type TicketStatus,
} from "@/hooks/use-support";

const categories: {
  value: TicketCategory;
  label: string;
}[] = [
  { value: "general", label: "General enquiry" },
  { value: "account", label: "Account" },
  { value: "orders", label: "Orders" },
  { value: "payments", label: "Payments" },
  { value: "products", label: "Products" },
  { value: "merchant", label: "Merchant support" },
  { value: "technical", label: "Technical issue" },
  { value: "other", label: "Other" },
];

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({
  status,
}: {
  status: TicketStatus;
}) {
  const colors: Record<TicketStatus, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function SupportContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShopLayout>
      <main className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
        {children}
      </main>
    </ShopLayout>
  );
}

function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <SupportContainer>
        <p className="text-muted-foreground">
          Loading your account...
        </p>
      </SupportContainer>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return <>{children}</>;
}

export function ContactPage() {
  return (
    <SupportContainer>
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          SokoKE Support
        </p>

        <h1 className="mt-3 font-serif text-4xl font-bold">
          Contact Us
        </h1>

        <p className="mt-4 text-lg text-muted-foreground">
          Need help with your account, an order, a product,
          or selling on SokoKE? Submit a support ticket
          and continue the conversation from your account.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Link
          href="/support/new"
          className="group rounded-2xl border bg-card p-7 transition-colors hover:border-primary"
        >
          <Headset className="h-9 w-9 text-primary" />

          <h2 className="mt-5 font-serif text-2xl font-bold">
            Raise a support ticket
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Describe your enquiry and receive a ticket
            reference for follow-up.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Create ticket
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          href="/support/tickets"
          className="group rounded-2xl border bg-card p-7 transition-colors hover:border-primary"
        >
          <MessageSquare className="h-9 w-9 text-primary" />

          <h2 className="mt-5 font-serif text-2xl font-bold">
            My support tickets
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Track ticket progress, read responses, and
            reply to the support team.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            View tickets
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </SupportContainer>
  );
}

export function NewSupportTicketPage() {
  const [, navigate] = useLocation();
  const createTicket = useCreateSupportTicket();

  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState<TicketCategory>("general");
  const [orderReference, setOrderReference] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error("Complete the subject and description");
      return;
    }

    try {
      const ticket = await createTicket.mutateAsync({
        subject: subject.trim(),
        category,
        description: description.trim(),
        orderReference: orderReference.trim(),
      });

      toast.success(
        `Support ticket ${ticket.reference} created`,
      );

      navigate(`/support/tickets/${ticket.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create ticket",
      );
    }
  }

  return (
    <AuthGate>
      <SupportContainer>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contact Us
        </Link>

        <div className="mt-7 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold">
            Raise a support ticket
          </h1>

          <p className="mt-3 text-muted-foreground">
            Provide the details below so our support team
            can review your enquiry.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6 rounded-2xl border bg-card p-6 md:p-8"
          >
            <div className="space-y-2">
              <label
                htmlFor="support-subject"
                className="text-sm font-medium"
              >
                Subject
              </label>

              <Input
                id="support-subject"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                maxLength={160}
                required
                placeholder="Briefly describe your enquiry"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="support-category"
                className="text-sm font-medium"
              >
                Category
              </label>

              <select
                id="support-category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as TicketCategory,
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {categories.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="support-order"
                className="text-sm font-medium"
              >
                Order reference (optional)
              </label>

              <Input
                id="support-order"
                value={orderReference}
                onChange={(event) =>
                  setOrderReference(event.target.value)
                }
                maxLength={100}
                placeholder="Enter an order reference if relevant"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="support-description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <Textarea
                id="support-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                maxLength={10000}
                required
                rows={7}
                placeholder="Explain the issue and include relevant details..."
              />
            </div>

            <Button
              type="submit"
              disabled={createTicket.isPending}
              className="w-full sm:w-auto"
            >
              <Ticket className="mr-2 h-4 w-4" />
              {createTicket.isPending
                ? "Submitting..."
                : "Submit ticket"}
            </Button>
          </form>
        </div>
      </SupportContainer>
    </AuthGate>
  );
}

export function MySupportTicketsPage() {
  const { isLoaded, isSignedIn } = useUser();

  const {
    data: tickets = [],
    isLoading,
    error,
  } = useMyTickets(isLoaded && isSignedIn === true);

  return (
    <AuthGate>
      <SupportContainer>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">
              My support tickets
            </h1>

            <p className="mt-2 text-muted-foreground">
              Track enquiries and continue conversations.
            </p>
          </div>

          <Link href="/support/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New ticket
            </Button>
          </Link>
        </div>

        {isLoading && (
          <p className="mt-8 text-muted-foreground">
            Loading tickets...
          </p>
        )}

        {error && (
          <p className="mt-8 text-destructive">
            {error.message}
          </p>
        )}

        {!isLoading && !error && tickets.length === 0 && (
          <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
            <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />

            <h2 className="mt-4 text-xl font-semibold">
              No support tickets yet
            </h2>

            <p className="mt-2 text-muted-foreground">
              Your submitted enquiries will appear here.
            </p>

            <Link href="/support/new">
              <Button className="mt-6">
                Create your first ticket
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/tickets/${ticket.id}`}
              className="block rounded-xl border bg-card p-5 transition-colors hover:border-primary"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-primary">
                    {ticket.reference}
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    {ticket.subject}
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Updated {formatDate(ticket.updatedAt)}
                  </p>
                </div>

                <StatusBadge status={ticket.status} />
              </div>
            </Link>
          ))}
        </div>
      </SupportContainer>
    </AuthGate>
  );
}

export function SupportTicketDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { isLoaded, isSignedIn, user } = useUser();

  const {
    data,
    isLoading,
    error,
  } = useSupportTicket(
    id,
    isLoaded && isSignedIn === true,
  );

  const reply = useReplyToTicket(id);
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

  return (
    <AuthGate>
      <SupportContainer>
        <Link
          href="/support/tickets"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          My tickets
        </Link>

        {isLoading && (
          <p className="mt-8 text-muted-foreground">
            Loading conversation...
          </p>
        )}

        {error && (
          <div className="mt-8 rounded-xl border p-6">
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
            <div className="mt-7 rounded-2xl border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-primary">
                  {data.ticket.reference}
                </p>

                <StatusBadge status={data.ticket.status} />
              </div>

              <h1 className="mt-3 font-serif text-3xl font-bold">
                {data.ticket.subject}
              </h1>

              <p className="mt-3 text-sm text-muted-foreground">
                Created {formatDate(data.ticket.createdAt)}
              </p>

              {data.ticket.orderReference && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Order reference:{" "}
                  {data.ticket.orderReference}
                </p>
              )}
            </div>

            <section className="mt-6 rounded-2xl border bg-card p-5 md:p-7">
              <h2 className="text-lg font-semibold">
                Conversation
              </h2>

              <div className="mt-6 space-y-5">
                {data.messages.map((item) => {
                  const ownMessage =
                    item.authorClerkId === user?.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex ${
                        ownMessage
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl p-4 md:max-w-[75%] ${
                          ownMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="mb-2 text-xs font-semibold opacity-75">
                          {ownMessage
                            ? "You"
                            : item.authorRole ===
                                "platform_admin"
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
                  This ticket is closed. Create a new
                  ticket if you need further assistance.
                </div>
              ) : (
                <form
                  onSubmit={handleReply}
                  className="mt-8 space-y-3 border-t pt-6"
                >
                  <label
                    htmlFor="ticket-reply"
                    className="text-sm font-semibold"
                  >
                    Write a reply
                  </label>

                  <Textarea
                    id="ticket-reply"
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    maxLength={10000}
                    rows={4}
                    required
                    placeholder="Type your message..."
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
      </SupportContainer>
    </AuthGate>
  );
}


import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type TicketCategory =
  | "general"
  | "account"
  | "orders"
  | "payments"
  | "products"
  | "merchant"
  | "technical"
  | "other";

export type SupportTicket = {
  id: number;
  reference: string;
  ownerClerkId: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  orderReference: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type SupportMessage = {
  id: number;
  ticketId: number;
  authorClerkId: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

export type TicketDetail = {
  ticket: SupportTicket;
  messages: SupportMessage[];
};

export type SupportNotification = {
  id: number;
  recipientClerkId: string;
  type: string;
  title: string;
  message: string;
  ticketId: number | null;
  isRead: boolean;
  createdAt: string;
};

export type CreateTicketInput = {
  subject: string;
  category: TicketCategory;
  description: string;
  orderReference?: string;
};

async function supportApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "Support request failed",
    );
  }

  return body as T;
}

export function useMyTickets(enabled = true) {
  return useQuery({
    queryKey: ["support", "my-tickets"],
    queryFn: () =>
      supportApi<SupportTicket[]>("/support/tickets"),
    enabled,
  });
}

export function useSupportTicket(
  id: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: () =>
      supportApi<TicketDetail>(`/support/tickets/${id}`),
    enabled: enabled && Number.isSafeInteger(id) && id > 0,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTicketInput) =>
      supportApi<SupportTicket>("/support/tickets", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["support", "my-tickets"],
      });
    },
  });
}

export function useReplyToTicket(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) =>
      supportApi<SupportMessage>(
        `/support/tickets/${id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["support", "ticket", id],
      });

      queryClient.invalidateQueries({
        queryKey: ["support", "my-tickets"],
      });

      queryClient.invalidateQueries({
        queryKey: ["support", "admin-tickets"],
      });
    },
  });
}

export function useAdminSupportTickets(
  status?: TicketStatus,
  enabled = true,
) {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  return useQuery({
    queryKey: ["support", "admin-tickets", status],
    queryFn: () =>
      supportApi<SupportTicket[]>(
        `/admin/support/tickets${query}`,
      ),
    enabled,
  });
}

export function useUpdateTicketStatus(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: TicketStatus) =>
      supportApi<SupportTicket>(
        `/admin/support/tickets/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["support", "ticket", id],
      });

      queryClient.invalidateQueries({
        queryKey: ["support", "admin-tickets"],
      });
    },
  });
}

export function useSupportNotifications(
  enabled = true,
) {
  return useQuery({
    queryKey: ["support", "notifications"],
    queryFn: () =>
      supportApi<SupportNotification[]>(
        "/notifications",
      ),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      supportApi<SupportNotification>(
        `/notifications/${id}/read`,
        {
          method: "PATCH",
        },
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["support", "notifications"],
      });
    },
  });
}

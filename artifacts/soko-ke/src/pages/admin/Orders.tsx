import { useState } from "react";
import { 
  useListOrders, 
  useUpdateOrderStatus,
  getListOrdersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKes } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Filter } from "lucide-react";

export function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListOrders({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50
  });
  
  const updateStatusMutation = useUpdateOrderStatus();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatusMutation.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        // We use setQueryData to optimistically update instead of full invalidate
        // but full invalidate is safer to sync everything including dashboard stats
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        // Since dashboard relies on this, invalidate that too if we want, but it refetches on mount anyway
        toast.success(`Order #${id} marked as ${newStatus}`);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-none';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-none';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-none';
      case 'delivered': return 'bg-green-100 text-green-800 border-none';
      default: return '';
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage and fulfill customer orders.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-md p-1 shadow-sm">
          <div className="pl-3 pr-2 text-muted-foreground"><Filter className="w-4 h-4" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent shadow-none focus:ring-0">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total (KES)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-[130px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-bold">
                    #{order.id.toString().padStart(5, '0')}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customerName || "Guest"}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
                    <div className="text-xs text-muted-foreground">{order.town}, {order.county}</div>
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {formatKes(order.totalKes)}
                    <div className="text-xs text-muted-foreground font-normal mt-1">{order.items.length} items</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select 
                      value={order.status} 
                      onValueChange={(val) => handleStatusChange(order.id, val)}
                    >
                      <SelectTrigger className="w-[130px] ml-auto h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirm</SelectItem>
                        <SelectItem value="shipped">Ship</SelectItem>
                        <SelectItem value="delivered">Deliver</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useListNotifications, useGetUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Package, Wallet, AlertCircle, CheckCheck, CalendarDays, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const iconMap: Record<string, any> = {
  package: Package,
  wallet: Wallet,
  "alert-circle": AlertCircle,
  calendar: CalendarDays,
  users: Users,
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d atrás`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications } = useListNotifications({
    query: { refetchInterval: 60000 },
  });
  const { data: unreadData } = useGetUnreadNotificationCount({
    query: { refetchInterval: 30000 },
  });

  const markReadMut = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      },
    },
  });

  const markAllReadMut = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      },
    },
  });

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read && notification.id > 0) {
      markReadMut.mutate({ id: notification.id });
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-card hover:bg-secondary hover:text-primary transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-card">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 rounded-2xl shadow-xl" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30 rounded-t-2xl">
          <h3 className="font-display font-semibold text-foreground">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary/80 h-7 px-2"
                onClick={() => markAllReadMut.mutate()}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Marcar todas lidas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {(!notifications || notifications.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tudo em ordem por enquanto!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification: any) => {
                const IconComponent = iconMap[notification.icon] || Bell;
                const isUnread = !notification.read;

                return (
                  <button
                    key={`${notification.isAuto ? "auto" : "stored"}-${notification.id}`}
                    className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex gap-3 items-start ${isUnread ? "bg-primary/5" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
                      notification.type === "overdue" || notification.type === "low_stock"
                        ? "bg-destructive/10 text-destructive"
                        : notification.type === "pending_payments"
                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-primary/10 text-primary"
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(notification.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

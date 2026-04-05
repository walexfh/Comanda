import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

function playBell() {
  try {
    const ctx = new AudioContext();

    const tone = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      g.gain.setValueAtTime(0, ctx.currentTime + startTime);
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + startTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    tone(880, 0, 1.2, 0.5);
    tone(1320, 0, 1.2, 0.3);
    tone(880, 0.35, 0.8, 0.4);
    tone(1320, 0.35, 0.8, 0.2);

    setTimeout(() => ctx.close(), 3000);
  } catch {
    // AudioContext may not be available in some contexts
  }
}

function showNotification(tableLabel: string, orderId: number, itemCount: number) {
  toast.success(`🛎️ Pedido Pronto — ${tableLabel}`, {
    description: `Pedido #${orderId} com ${itemCount} item${itemCount !== 1 ? "s" : ""} está pronto para servir!`,
    duration: 10000,
    position: "top-center",
    style: {
      background: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      border: "none",
      fontSize: "16px",
      fontWeight: "700",
    },
  });
}

export function useGarcomNotifications() {
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        const currentUser = userRef.current;
        if (currentUser?.tenantId) {
          ws.current?.send(JSON.stringify({ type: "subscribe", tenantId: currentUser.tenantId }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "order:new" || data.type === "order:updated") {
            queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }

          if (data.type === "order:updated" && data.order?.status === "pronto") {
            const order = data.order;
            const currentUser = userRef.current;
            if (currentUser?.role !== "waiter") return;

            playBell();

            const tableLabel = order.tableNumber ? `Mesa ${order.tableNumber}` : "Balcão";
            const itemCount = (order.items ?? []).length;
            showNotification(tableLabel, order.id, itemCount);
          }

          if (data.type === "order:bell") {
            const order = data.order;
            const currentUser = userRef.current;
            if (currentUser?.role !== "waiter") return;

            playBell();

            const tableLabel = order?.tableNumber ? `Mesa ${order.tableNumber}` : "Balcão";
            const orderId = order?.id ?? "?";
            const itemCount = (order?.items ?? []).length;
            showNotification(tableLabel, orderId, itemCount);
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.current.onclose = () => {
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [queryClient]);
}

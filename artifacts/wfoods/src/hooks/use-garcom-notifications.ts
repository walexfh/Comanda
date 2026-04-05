import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

function playBell() {
  try {
    const ctx = new AudioContext();

    const bell = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    bell(880, 0, 1.2, 0.5);
    bell(1320, 0, 1.2, 0.3);
    bell(880, 0.35, 0.8, 0.4);
    bell(1320, 0.35, 0.8, 0.2);

    setTimeout(() => ctx.close(), 3000);
  } catch {
    // AudioContext not available — silently ignore
  }
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

            const isMyOrder =
              currentUser?.role === "waiter" &&
              order.waiterId != null &&
              order.waiterId === currentUser.id;

            if (isMyOrder) {
              playBell();

              const tableLabel = order.tableNumber ? `Mesa ${order.tableNumber}` : `Mesa`;
              const itemCount = (order.items ?? []).length;

              toast.success(`🛎️ Pedido Pronto — ${tableLabel}`, {
                description: `Pedido #${order.id} com ${itemCount} item${itemCount !== 1 ? "s" : ""} está pronto para servir!`,
                duration: 8000,
                position: "top-center",
                style: {
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                },
              });
            }
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

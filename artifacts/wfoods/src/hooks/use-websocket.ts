import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export function useWebSocket() {
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

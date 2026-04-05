import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOrdersQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const ws = useRef<WebSocket | null>(null);

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
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.current.onclose = () => {
        setTimeout(connect, 3000); // Reconnect after 3 seconds
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

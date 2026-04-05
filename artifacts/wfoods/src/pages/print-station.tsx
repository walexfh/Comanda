import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SECTOR_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  cozinha: { label: "COZINHA", emoji: "🍳", color: "#f97316" },
  bar: { label: "BAR", emoji: "🍺", color: "#3b82f6" },
  caixa: { label: "CAIXA", emoji: "🧾", color: "#22c55e" },
};

const METHOD_LABELS: Record<string, string> = {
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  pix: "Pix",
};

interface OrderItem {
  id: number;
  productName: string;
  quantity: number;
  notes?: string | null;
  printSector?: string | null;
  unitPrice?: number;
}

interface IncomingOrder {
  id: number;
  tableNumber?: number | null;
  customerName?: string | null;
  waiterName?: string | null;
  items: OrderItem[];
  createdAt: string;
}

interface ReceiptData {
  tableNumber: number | string;
  method: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  serviceFee: number;
  total: number;
  timestamp: string;
}

type Job =
  | { kind: "order"; id: string; order: IncomingOrder; timestamp: Date }
  | { kind: "receipt"; id: string; receipt: ReceiptData; timestamp: Date };

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function playAlert() {
  try {
    const ctx = new AudioContext();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.6, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.15);
    beep(1100, 0.2, 0.15);
    beep(880, 0.4, 0.15);
    setTimeout(() => ctx.close(), 2000);
  } catch { }
}

function OrderTicket({ job, sector, restaurantName }: { job: Job & { kind: "order" }; sector: string; restaurantName: string }) {
  const sectorInfo = SECTOR_LABELS[sector] ?? { label: sector.toUpperCase(), emoji: "🖨️", color: "#888" };
  const tableLabel = job.order.tableNumber ? `MESA ${job.order.tableNumber}` : "BALCÃO";
  return (
    <div className="ticket">
      <div className="ticket-header">
        <div className="ticket-sector" style={{ color: sectorInfo.color }}>
          {sectorInfo.emoji} {sectorInfo.label}
        </div>
        <div className="ticket-restaurant">{restaurantName}</div>
      </div>
      <div className="ticket-divider" />
      <div className="ticket-table">{tableLabel}</div>
      <div className="ticket-meta">
        Pedido #{job.order.id} • {format(new Date(job.order.createdAt), "HH:mm", { locale: ptBR })}
        {job.order.waiterName && ` • ${job.order.waiterName}`}
      </div>
      <div className="ticket-divider" />
      <div className="ticket-items">
        {job.order.items.map((item) => (
          <div key={item.id} className="ticket-item">
            <div className="ticket-item-row">
              <span className="ticket-qty">{item.quantity}x</span>
              <span className="ticket-name">{item.productName}</span>
            </div>
            {item.notes && <div className="ticket-obs">⚠️ {item.notes}</div>}
          </div>
        ))}
      </div>
      <div className="ticket-divider" />
      <div className="ticket-footer">
        {format(new Date(job.order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
      </div>
    </div>
  );
}

function ReceiptTicket({ job, restaurantName }: { job: Job & { kind: "receipt" }; restaurantName: string }) {
  const r = job.receipt;
  const tableLabel = r.tableNumber ? `MESA ${r.tableNumber}` : "BALCÃO";
  return (
    <div className="ticket">
      <div className="ticket-header">
        <div className="ticket-sector" style={{ color: "#22c55e" }}>🧾 CAIXA</div>
        <div className="ticket-restaurant">{restaurantName}</div>
      </div>
      <div className="ticket-divider" />
      <div className="ticket-table">{tableLabel}</div>
      <div className="ticket-meta">
        {format(new Date(r.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
      </div>
      <div className="ticket-divider" />
      <div className="ticket-items">
        {r.items.map((item, i) => (
          <div key={i} className="ticket-item">
            <div className="ticket-item-row">
              <span className="ticket-qty">{item.quantity}x</span>
              <span className="ticket-name">{item.name}</span>
              <span className="ticket-price">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="ticket-divider" />
      <div className="ticket-total-section">
        <div className="ticket-total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(r.subtotal)}</span>
        </div>
        <div className="ticket-total-row">
          <span>Taxa de serviço (10%)</span>
          <span>{formatCurrency(r.serviceFee)}</span>
        </div>
        <div className="ticket-divider-thin" />
        <div className="ticket-total-row ticket-total-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(r.total)}</span>
        </div>
        <div className="ticket-payment">
          Pagamento: {METHOD_LABELS[r.method] ?? r.method}
        </div>
      </div>
      <div className="ticket-divider" />
      <div className="ticket-footer">Obrigado pela preferência!</div>
    </div>
  );
}

export default function PrintStation() {
  const params = new URLSearchParams(window.location.search);
  const sector = params.get("sector") ?? "";
  const slug = params.get("slug") ?? "";

  const sectorInfo = SECTOR_LABELS[sector];
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [restaurantName, setRestaurantName] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const tenantIdRef = useRef<number | null>(null);
  const printQueueRef = useRef<string[]>([]);
  const printingRef = useRef(false);

  const autoPrint = (_jobId: string) => {
    printQueueRef.current.push(_jobId);
    if (!printingRef.current) processQueue();
  };

  const processQueue = () => {
    if (printQueueRef.current.length === 0) {
      printingRef.current = false;
      return;
    }
    printingRef.current = true;
    setTimeout(() => {
      window.print();
      printQueueRef.current.shift();
      setTimeout(processQueue, 1500);
    }, 500);
  };

  const handleOrderNew = (order: IncomingOrder) => {
    if (sector === "caixa") return;
    const sectorItems = order.items.filter(item => item.printSector === sector);
    if (sectorItems.length === 0) return;
    const filteredOrder = { ...order, items: sectorItems };
    const id = `order-${order.id}-${Date.now()}`;
    const job: Job = { kind: "order", id, order: filteredOrder, timestamp: new Date() };
    playAlert();
    setJobs(prev => [job, ...prev.slice(0, 49)]);
    autoPrint(id);
  };

  const handleReceiptPrint = (receipt: ReceiptData) => {
    if (sector !== "caixa") return;
    const id = `receipt-${Date.now()}`;
    const job: Job = { kind: "receipt", id, receipt, timestamp: new Date() };
    playAlert();
    setJobs(prev => [job, ...prev.slice(0, 49)]);
    autoPrint(id);
  };

  useEffect(() => {
    if (!slug || !sector) { setStatus("error"); return; }

    const base = import.meta.env.BASE_URL ?? "/";
    fetch(`${base}api/public/tenant/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (!data.id) throw new Error("Not found");
        tenantIdRef.current = data.id;
        setRestaurantName(data.name);
        connectWs(data.id);
      })
      .catch(() => setStatus("error"));

    return () => { ws.current?.close(); };
  }, [slug, sector]);

  const connectWs = (tenantId: number) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws.current = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.current.onopen = () => {
      ws.current!.send(JSON.stringify({ type: "subscribe", tenantId }));
      setStatus("connected");
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "order:new" && msg.order) handleOrderNew(msg.order);
        if (msg.type === "receipt:print" && msg.receipt) handleReceiptPrint(msg.receipt);
      } catch { }
    };

    ws.current.onclose = () => {
      setStatus("connecting");
      setTimeout(() => connectWs(tenantId), 3000);
    };

    ws.current.onerror = () => setStatus("error");
  };

  const statusColor = status === "connected" ? "#22c55e" : status === "connecting" ? "#f59e0b" : "#ef4444";
  const statusLabel = status === "connected" ? "Conectado" : status === "connecting" ? "Conectando..." : "Erro de conexão";
  const accentColor = sectorInfo?.color ?? "#888";

  if (!slug || !sector || !sectorInfo) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "monospace", color: "#ef4444", padding: "2rem", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Link inválido</div>
          <div style={{ marginTop: "0.5rem", color: "#888" }}>Acesse esta página pelo painel admin em <strong>Impressoras</strong>.</div>
        </div>
      </div>
    );
  }

  const latestJob = jobs[0];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #111; color: #eee; font-family: 'Courier New', monospace; }
        .screen-layout { display: flex; flex-direction: column; min-height: 100vh; }
        .header { background: #1a1a1a; border-bottom: 2px solid ${accentColor}40; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-sector { font-size: 1.5rem; font-weight: bold; color: ${accentColor}; }
        .header-restaurant { font-size: 0.85rem; color: #888; }
        .header-status { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; }
        .jobs-list { flex: 1; padding: 16px; overflow-y: auto; }
        .jobs-empty { display: flex; align-items: center; justify-content: center; min-height: 300px; color: #444; font-size: 0.9rem; text-align: center; }
        .job-card { background: #1a1a1a; border: 1px solid #333; border-left: 4px solid ${accentColor}; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
        .job-table { font-size: 1.3rem; font-weight: bold; color: ${accentColor}; margin-bottom: 2px; }
        .job-meta { font-size: 0.75rem; color: #666; margin-bottom: 10px; }
        .job-item { margin-bottom: 6px; }
        .job-item-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .job-qty { background: ${accentColor}; color: #fff; border-radius: 4px; padding: 1px 6px; font-weight: bold; font-size: 0.8rem; flex-shrink: 0; }
        .job-name { color: #eee; flex: 1; }
        .job-price { color: #aaa; font-size: 0.8rem; }
        .job-obs { font-size: 0.75rem; background: #2a2200; border-left: 3px solid #f59e0b; color: #fbbf24; padding: 3px 8px; margin-left: 28px; margin-top: 2px; border-radius: 2px; }
        .job-divider { border-top: 1px dashed #333; margin: 8px 0; }
        .job-totals { font-size: 0.8rem; color: #aaa; space-y: 2px; }
        .job-total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .job-total-bold { font-weight: bold; font-size: 1rem; color: ${accentColor}; }
        .job-payment { font-size: 0.75rem; color: #888; margin-top: 4px; }
        .job-time { font-size: 0.7rem; color: #555; margin-top: 8px; text-align: right; }

        @media print {
          body { background: #fff; color: #000; }
          .screen-layout { display: none !important; }
          .ticket { display: block !important; }
        }
        .ticket { display: none; }
        .ticket { font-family: 'Courier New', monospace; font-size: 14px; padding: 12px; max-width: 80mm; color: #000; background: #fff; }
        .ticket-header { text-align: center; margin-bottom: 8px; }
        .ticket-sector { font-size: 20px; font-weight: bold; margin-bottom: 2px; }
        .ticket-restaurant { font-size: 11px; color: #555; }
        .ticket-divider { border-top: 2px dashed #000; margin: 8px 0; }
        .ticket-divider-thin { border-top: 1px solid #ccc; margin: 6px 0; }
        .ticket-table { font-size: 22px; font-weight: bold; text-align: center; }
        .ticket-meta { font-size: 11px; color: #555; text-align: center; margin-bottom: 4px; }
        .ticket-items { margin: 8px 0; }
        .ticket-item { margin-bottom: 8px; }
        .ticket-item-row { display: flex; align-items: center; gap: 6px; }
        .ticket-qty { background: #000; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-weight: bold; }
        .ticket-name { font-size: 15px; font-weight: bold; flex: 1; }
        .ticket-price { font-size: 13px; }
        .ticket-obs { font-size: 12px; background: #fffde7; border-left: 3px solid #f9a825; padding: 3px 8px; margin-top: 3px; margin-left: 24px; }
        .ticket-total-section { margin: 4px 0; }
        .ticket-total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
        .ticket-total-bold { font-weight: bold; font-size: 16px; }
        .ticket-payment { text-align: center; font-size: 12px; margin-top: 4px; color: #555; }
        .ticket-footer { text-align: center; font-size: 10px; color: #888; }
      `}</style>

      <div className="screen-layout">
        <div className="header">
          <div className="header-left">
            <span style={{ fontSize: "1.8rem" }}>{sectorInfo.emoji}</span>
            <div>
              <div className="header-sector">{sectorInfo.label}</div>
              <div className="header-restaurant">{restaurantName || slug}</div>
            </div>
          </div>
          <div className="header-status">
            <div className="status-dot" />
            <span style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>

        <div className="jobs-list">
          {jobs.length === 0 ? (
            <div className="jobs-empty">
              <div>
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🖨️</div>
                <div>Aguardando {sector === "caixa" ? "fechamentos de conta" : "pedidos"}...</div>
                <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#555" }}>
                  {sector === "caixa"
                    ? "Contas fechadas pelo garçom aparecerão aqui e serão impressas automaticamente"
                    : `Novos pedidos para ${sectorInfo.label} aparecerão aqui e serão impressos automaticamente`}
                </div>
              </div>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="job-card">
                {job.kind === "order" ? (
                  <>
                    <div className="job-table">
                      {job.order.tableNumber ? `Mesa ${job.order.tableNumber}` : "Balcão"}
                    </div>
                    <div className="job-meta">
                      Pedido #{job.order.id} • {format(new Date(job.order.createdAt), "HH:mm")}
                      {job.order.waiterName && ` • ${job.order.waiterName}`}
                    </div>
                    {job.order.items.map(item => (
                      <div key={item.id} className="job-item">
                        <div className="job-item-row">
                          <span className="job-qty">{item.quantity}x</span>
                          <span className="job-name">{item.productName}</span>
                        </div>
                        {item.notes && <div className="job-obs">⚠️ {item.notes}</div>}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="job-table">
                      {job.receipt.tableNumber ? `Mesa ${job.receipt.tableNumber}` : "Balcão"} — Conta
                    </div>
                    <div className="job-meta">
                      {format(new Date(job.receipt.timestamp), "dd/MM/yyyy HH:mm")}
                    </div>
                    {job.receipt.items.map((item, i) => (
                      <div key={i} className="job-item">
                        <div className="job-item-row">
                          <span className="job-qty">{item.quantity}x</span>
                          <span className="job-name">{item.name}</span>
                          <span className="job-price">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="job-divider" />
                    <div className="job-totals">
                      <div className="job-total-row"><span>Subtotal</span><span>{formatCurrency(job.receipt.subtotal)}</span></div>
                      <div className="job-total-row"><span>Taxa (10%)</span><span>{formatCurrency(job.receipt.serviceFee)}</span></div>
                      <div className="job-total-row job-total-bold"><span>TOTAL</span><span>{formatCurrency(job.receipt.total)}</span></div>
                    </div>
                    <div className="job-payment">
                      💳 {METHOD_LABELS[job.receipt.method] ?? job.receipt.method}
                    </div>
                  </>
                )}
                <div className="job-time">{format(job.timestamp, "HH:mm:ss")}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {latestJob?.kind === "order" && (
        <OrderTicket job={latestJob} sector={sector} restaurantName={restaurantName} />
      )}
      {latestJob?.kind === "receipt" && (
        <ReceiptTicket job={latestJob} restaurantName={restaurantName} />
      )}
    </>
  );
}

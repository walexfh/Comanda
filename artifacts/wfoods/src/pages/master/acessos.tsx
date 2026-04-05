import { useState } from "react";
import { MasterLayout } from "@/components/master-layout";
import { useMasterAuth } from "@/lib/master-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, CheckCircle, XCircle, Clock, Mail, Phone, Building2, MessageSquare } from "lucide-react";

interface AllowedEmail {
  id: number;
  email: string;
  note: string | null;
  createdAt: string;
}

interface RegistrationRequest {
  id: number;
  name: string;
  email: string;
  restaurantName: string;
  phone: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function MasterAcessos() {
  const { apiFetch } = useMasterAuth();
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");

  const { data: allowedEmails = [], isLoading: loadingEmails } = useQuery<AllowedEmail[]>({
    queryKey: ["master-allowed-emails"],
    queryFn: () => apiFetch<AllowedEmail[]>("/api/master/allowed-emails"),
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<RegistrationRequest[]>({
    queryKey: ["master-registration-requests"],
    queryFn: () => apiFetch<RegistrationRequest[]>("/api/master/registration-requests"),
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const addEmail = useMutation({
    mutationFn: () => apiFetch("/api/master/allowed-emails", {
      method: "POST",
      body: JSON.stringify({ email: newEmail.trim().toLowerCase(), note: newNote.trim() || null }),
    }),
    onSuccess: () => {
      toast.success("E-mail adicionado com sucesso.");
      setNewEmail("");
      setNewNote("");
      qc.invalidateQueries({ queryKey: ["master-allowed-emails"] });
    },
    onError: () => toast.error("Erro ao adicionar e-mail. Verifique se já está na lista."),
  });

  const removeEmail = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/master/allowed-emails/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("E-mail removido.");
      qc.invalidateQueries({ queryKey: ["master-allowed-emails"] });
    },
    onError: () => toast.error("Erro ao remover e-mail."),
  });

  const approveRequest = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/master/registration-requests/${id}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Solicitação aprovada! E-mail adicionado à lista.");
      qc.invalidateQueries({ queryKey: ["master-registration-requests"] });
      qc.invalidateQueries({ queryKey: ["master-allowed-emails"] });
    },
    onError: () => toast.error("Erro ao aprovar solicitação."),
  });

  const rejectRequest = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/master/registration-requests/${id}/reject`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Solicitação rejeitada.");
      qc.invalidateQueries({ queryKey: ["master-registration-requests"] });
    },
    onError: () => toast.error("Erro ao rejeitar solicitação."),
  });

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    addEmail.mutate();
  };

  const STATUS_CONFIG = {
    pending: { label: "Pendente", icon: Clock, color: "text-yellow-400", variant: "outline" as const },
    approved: { label: "Aprovado", icon: CheckCircle, color: "text-green-400", variant: "default" as const },
    rejected: { label: "Rejeitado", icon: XCircle, color: "text-red-400", variant: "destructive" as const },
  };

  return (
    <MasterLayout title="Controle de Acessos">
      <Tabs defaultValue="solicitacoes">
        <TabsList className="mb-6">
          <TabsTrigger value="solicitacoes" className="gap-2">
            Solicitações
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="emails">E-mails Liberados</TabsTrigger>
        </TabsList>

        {/* ── Solicitações ── */}
        <TabsContent value="solicitacoes">
          <div className="space-y-4">
            {loadingRequests ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação de acesso recebida.
              </div>
            ) : (
              requests.map(req => {
                const cfg = STATUS_CONFIG[req.status];
                const Icon = cfg.icon;
                return (
                  <Card key={req.id} className={req.status === "pending" ? "border-yellow-500/30" : ""}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{req.name}</span>
                            <Badge variant={cfg.variant} className="gap-1 text-xs">
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">#{req.id}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{req.restaurantName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{req.email}</span>
                            </div>
                            {req.phone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                <span>{req.phone}</span>
                              </div>
                            )}
                            {req.message && (
                              <div className="flex items-start gap-1.5 text-muted-foreground sm:col-span-2">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span className="text-xs italic">{req.message}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>

                        {req.status === "pending" && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => approveRequest.mutate(req.id)}
                              disabled={approveRequest.isPending}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1.5"
                              onClick={() => rejectRequest.mutate(req.id)}
                              disabled={rejectRequest.isPending}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── E-mails Liberados ── */}
        <TabsContent value="emails">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Adicionar E-mail</CardTitle>
                <CardDescription>E-mails desta lista podem criar um restaurante diretamente.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEmail} className="flex gap-2 flex-wrap">
                  <Input
                    type="email"
                    placeholder="email@restaurante.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="flex-1 min-w-48 bg-background"
                    required
                  />
                  <Input
                    placeholder="Observação (opcional)"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="flex-1 min-w-32 bg-background"
                  />
                  <Button type="submit" className="gap-1.5" disabled={addEmail.isPending}>
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </form>
              </CardContent>
            </Card>

            {loadingEmails ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : allowedEmails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Nenhum e-mail liberado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {allowedEmails.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.email}</div>
                      {item.note && (
                        <div className="text-xs text-muted-foreground truncate">{item.note}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Adicionado em {format(new Date(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeEmail.mutate(item.id)}
                      disabled={removeEmail.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </MasterLayout>
  );
}

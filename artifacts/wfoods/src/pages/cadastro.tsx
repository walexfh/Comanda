import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

type RequestForm = {
  name: string;
  restaurantName: string;
  email: string;
  phone: string;
  cnpj: string;
  address: string;
  message: string;
};

export default function Cadastro() {
  const [sent, setSent] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [sentEmail, setSentEmail] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RequestForm>();

  const onSubmit = async (data: RequestForm) => {
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const res = await fetch(`${base}api/tenants/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email.trim().toLowerCase(),
          restaurantName: data.restaurantName,
          phone: data.phone,
          cnpj: data.cnpj,
          address: data.address,
          message: data.message || null,
        }),
      });
      const result = await res.json();

      if (result.duplicate) {
        toast.info("Já existe uma solicitação com este e-mail. Aguarde o contato do administrador.");
        return;
      }

      setSentEmail(data.email.trim().toLowerCase());
      setRequestId(result.requestId ?? null);
      setSent(true);
    } catch {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 dark">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="text-primary font-bold text-xl hover:underline">
            WFoods ComandaFácil
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Solicitar Acesso</h2>
          <p className="text-muted-foreground text-sm">
            Preencha os dados abaixo para solicitar o cadastro do seu restaurante.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seus Dados</p>

              <div className="space-y-1.5">
                <Label htmlFor="name">Seu nome *</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  {...register("name", { required: "Nome é obrigatório" })}
                  className="bg-background"
                />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@meurestaurante.com"
                  {...register("email", { required: "E-mail é obrigatório" })}
                  className="bg-background"
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...register("phone", { required: "Telefone é obrigatório" })}
                  className="bg-background"
                />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border/40 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados do Restaurante</p>

              <div className="space-y-1.5">
                <Label htmlFor="restaurantName">Nome do Restaurante *</Label>
                <Input
                  id="restaurantName"
                  placeholder="Boteco do João"
                  {...register("restaurantName", { required: "Nome do restaurante é obrigatório" })}
                  className="bg-background"
                />
                {errors.restaurantName && <p className="text-destructive text-xs">{errors.restaurantName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  {...register("cnpj", { required: "CNPJ é obrigatório" })}
                  className="bg-background"
                />
                {errors.cnpj && <p className="text-destructive text-xs">{errors.cnpj.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  placeholder="Rua das Flores, 123 — São Paulo, SP"
                  {...register("address", { required: "Endereço é obrigatório" })}
                  className="bg-background"
                />
                {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Mensagem <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <textarea
                  id="message"
                  {...register("message")}
                  placeholder="Conte um pouco mais sobre seu estabelecimento..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login/admin" className="text-primary hover:underline">Fazer login</Link>
            </p>
          </form>
        ) : (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <Clock className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Solicitação Enviada!</h3>
              <p className="text-muted-foreground text-sm">
                Sua solicitação foi registrada{requestId ? ` (#${requestId})` : ""}.
              </p>
              <p className="text-muted-foreground text-sm">
                Entraremos em contato pelo e-mail{" "}
                <strong className="text-foreground">{sentEmail}</strong> em breve.
              </p>
            </div>
            <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
              Normalmente respondemos em até 1 dia útil.
            </div>
            <Link href="/login/admin" className="text-sm text-primary hover:underline block">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

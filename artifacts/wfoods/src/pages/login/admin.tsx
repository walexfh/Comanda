import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  tenantSlug: z.string().min(1, "Identificador obrigatório"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const slugFromUrl = params.get("slug") ?? "";

  const { setToken, user } = useAuth();
  const adminLogin = useAdminLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      tenantSlug: slugFromUrl,
    },
  });

  useEffect(() => {
    if (slugFromUrl) {
      form.setValue("tenantSlug", slugFromUrl);
    }
  }, [slugFromUrl, form]);

  useEffect(() => {
    if (user?.role === "admin") {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  function onSubmit(values: z.infer<typeof loginSchema>) {
    adminLogin.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast.success("Login efetuado com sucesso");
          setLocation("/admin");
        },
        onError: () => {
          toast.error("Restaurante, e-mail ou senha incorretos");
        },
      }
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 dark">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="space-y-1">
          <Link href="/" className="text-primary font-bold text-sm text-center block hover:underline mb-1">
            WFoods ComandaFácil
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Acesso Admin</CardTitle>
          <CardDescription className="text-center">
            Entre com os dados do seu restaurante
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tenantSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificador do Restaurante</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm shrink-0">/menu/</span>
                        <Input placeholder="meu-restaurante" {...field} />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      O identificador foi definido no momento do cadastro
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@exemplo.com" type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={adminLogin.isPending}>
                {adminLogin.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="text-primary hover:underline">
              Cadastrar restaurante
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

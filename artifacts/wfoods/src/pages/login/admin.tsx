import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  tenantSlug: z.string().min(1, "Slug obrigatório"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { setToken, user } = useAuth();
  const adminLogin = useAdminLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      tenantSlug: "",
    },
  });

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
        onError: (err) => {
          toast.error(err.message || "Erro ao efetuar login");
        },
      }
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 dark">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Acesso ao painel gerencial do WFoods ComandaFácil
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
                    <FormLabel>Restaurante (Slug)</FormLabel>
                    <FormControl>
                      <Input placeholder="meu-restaurante" {...field} />
                    </FormControl>
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
                      <Input placeholder="admin@exemplo.com" type="email" {...field} />
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
                      <Input placeholder="••••••••" type="password" {...field} />
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
        </CardContent>
      </Card>
    </div>
  );
}

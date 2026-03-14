import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Heart, Shield, Users, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result.error) setError(result.error);
      } else {
        const result = await register({ email, password, firstName, lastName });
        if (result.error) setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl border border-border/50">
        <div className="bg-primary p-10 flex flex-col justify-between text-primary-foreground">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary-foreground/20 p-2.5 rounded-xl">
                <Building2 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-none">Casa de Apoio</h1>
                <p className="text-sm text-primary-foreground/70 mt-0.5">Sistema de Gestão</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold leading-tight mb-4">
              Cuidando de quem<br />mais precisa
            </h2>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              Plataforma completa para gestão de residentes, finanças, estoque e atividades da sua casa de apoio.
            </p>
          </div>

          <div className="space-y-4 mt-10">
            {[
              { icon: Users, text: "Gestão completa de residentes" },
              { icon: Heart, text: "Controle de atividades e cuidados" },
              { icon: Shield, text: "Financeiro e estoque integrados" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="bg-primary-foreground/15 p-1.5 rounded-lg flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm text-primary-foreground/85">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {mode === "login"
                ? "Faça login para acessar o sistema de gestão."
                : "Preencha os dados para criar sua conta."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="Nome"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm">Sobrenome</Label>
                  <Input
                    id="lastName"
                    placeholder="Sobrenome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Sua senha"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-base font-semibold rounded-xl"
              size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "login" ? "Entrando..." : "Criando conta..."}
                </span>
              ) : (
                mode === "login" ? "Entrar" : "Criar Conta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
              <button
                type="button"
                onClick={switchMode}
                className="text-primary font-semibold hover:underline"
              >
                {mode === "login" ? "Cadastre-se" : "Faça login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

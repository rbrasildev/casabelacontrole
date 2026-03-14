import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Package, 
  CalendarDays, 
  HandCoins,
  BarChart3,
  Menu,
  LogOut,
  UserCog,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { NotificationBell } from "@/components/NotificationBell";

interface AppLayoutProps {
  children: ReactNode;
}

const ADMIN_ROLES = ["admin", "manager"];

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: currentUser } = useCurrentUser();

  const isAdmin = currentUser ? ADMIN_ROLES.includes(currentUser.role) : false;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/residentes", label: "Residentes", icon: Users },
    { href: "/financeiro", label: "Financeiro", icon: Wallet },
    { href: "/estoque", label: "Estoque", icon: Package },
    { href: "/atividades", label: "Atividades", icon: CalendarDays },
    { href: "/vaquinha", label: "Vaquinha", icon: HandCoins },
    { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    ...(isAdmin ? [
      { href: "/usuarios", label: "Usuários", icon: UserCog },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ] : []),
  ];

  const userDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Usuário"
    : "Usuário";

  const userInitials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border shadow-sm z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo.png`} 
              alt="Casa de Apoio Logo" 
              className="w-8 h-8 object-contain mix-blend-multiply"
            />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-primary leading-none">Casa de Apoio</h1>
            <p className="text-xs text-muted-foreground font-medium">Gestão Integrada</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : "group-hover:text-primary transition-colors"}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-secondary/50">
            <Avatar className="h-9 w-9 border border-border flex-shrink-0">
              {user?.profileImageUrl && (
                <AvatarImage src={user.profileImageUrl} alt={userDisplayName} />
              )}
              <AvatarFallback className="text-xs font-semibold">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userDisplayName}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sair"
              className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border z-10">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-lg text-primary">Casa de Apoio</span>
          </div>
          <Button variant="ghost" size="icon">
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <header className="hidden md:flex h-20 items-center justify-end px-8 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

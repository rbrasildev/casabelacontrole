import { useGetDashboardStats } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Calendar,
  Wallet,
  Activity as ActivityIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" />
        <div>
          <h3 className="font-bold">Erro ao carregar dados</h3>
          <p className="text-sm opacity-80">Não foi possível conectar ao servidor. O backend pode não estar rodando ou a API não foi implementada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground mt-1 text-lg">Acompanhe os principais indicadores da casa.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Residentes Ativos" 
          value={stats.activeResidents.toString()} 
          subValue={`${stats.totalResidents} total cadastrado`}
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Saldo do Mês" 
          value={formatCurrency(stats.monthlyBalance)} 
          subValue={`+${formatCurrency(stats.monthlyIncome)} / -${formatCurrency(stats.monthlyExpenses)}`}
          icon={Wallet} 
          color={stats.monthlyBalance >= 0 ? "bg-primary" : "bg-destructive"} 
        />
        <StatCard 
          title="Pagamentos Pendentes" 
          value={stats.pendingPayments.toString()} 
          subValue="Aguardando recebimento"
          icon={TrendingDown} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Alertas de Estoque" 
          value={stats.lowStockItems.toString()} 
          subValue="Itens abaixo do mínimo"
          icon={AlertTriangle} 
          color="bg-destructive" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Transações Recentes
            </h2>
          </div>
          
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma transação recente.</div>
          ) : (
            <div className="space-y-4">
              {stats.recentTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.category} • {formatDate(t.date)}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${t.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Activities */}
        <div className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Próximas Atividades
            </h2>
          </div>

          {stats.upcomingActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma atividade programada.</div>
          ) : (
            <div className="space-y-4">
              {stats.upcomingActivities.map(a => (
                <div key={a.id} className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="bg-background rounded-lg p-2 text-center min-w-[60px] border border-border shadow-sm">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{new Date(a.scheduledDate).toLocaleDateString('pt-BR', { month: 'short' })}</p>
                    <p className="text-lg font-bold text-foreground leading-none">{new Date(a.scheduledDate).getDate()}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{a.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.scheduledTime || 'Horário a definir'} • {a.type}</p>
                    {a.residentName && (
                      <p className="text-xs mt-1 inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3" /> {a.residentName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, color }: any) {
  return (
    <div className="bg-card p-6 rounded-2xl shadow-lg shadow-black/5 border border-border/50 hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-bold font-display text-foreground mt-2 tracking-tight">{value}</h3>
          <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 inline-block px-2 py-1 rounded-md">{subValue}</p>
        </div>
        <div className={`${color} text-white p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

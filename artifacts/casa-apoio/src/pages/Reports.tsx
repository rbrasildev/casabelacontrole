import { useGetDashboardStats } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from "recharts";
import { Card } from "@/components/ui/card";

export function Reports() {
  const { data: stats } = useGetDashboardStats();

  // Mock data for charts since backend only gives aggregates, in a real app this would come from a /reports endpoint
  const mockFinanceData = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Fev', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Abr', income: 2780, expense: 3908 },
    { name: 'Mai', income: 1890, expense: 4800 },
    { name: 'Atual', income: stats?.monthlyIncome || 0, expense: stats?.monthlyExpenses || 0 },
  ];

  const residentData = [
    { name: 'Ativos', value: stats?.activeResidents || 0, color: '#2A9D8F' },
    { name: 'Alta/Inativos', value: (stats?.totalResidents || 0) - (stats?.activeResidents || 0), color: '#E9C46A' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Relatórios Gerenciais</h1>
        <p className="text-muted-foreground mt-1">Visualize o desempenho e a ocupação da casa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-2xl shadow-lg border-border">
          <h3 className="font-display font-bold text-xl mb-6 text-foreground">Fluxo de Caixa (Mensal)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockFinanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="income" name="Receitas" fill="#2A9D8F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#E76F51" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl shadow-lg border-border flex flex-col">
          <h3 className="font-display font-bold text-xl mb-2 text-foreground">Ocupação / Residentes</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={residentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {residentData.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-display font-bold text-foreground">{stats?.totalResidents || 0}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {residentData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-sm font-medium">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

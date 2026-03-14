import { useState } from "react";
import { 
  useListCampaigns, 
  useCreateCampaign, 
  useUpdateCampaign, 
  useDeleteCampaign, 
  useListContributions,
  useCreateContribution,
  useDeleteContribution,
  getListCampaignsQueryKey,
  getListContributionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  HandCoins, Plus, MoreVertical, Edit, Trash2, Copy, Check, Users, Target, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const campaignSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  description: z.string().optional().nullable(),
  goalAmount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  startDate: z.string().min(10, "Data inicial obrigatória"),
  endDate: z.string().optional().nullable(),
  pixKey: z.string().optional().nullable(),
  status: z.enum(["active", "completed", "closed"]),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

const contributionSchema = z.object({
  contributorName: z.string().min(2, "Nome é obrigatório"),
  contributorContact: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01, "Valor inválido"),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ContributionFormValues = z.infer<typeof contributionSchema>;

export function Vaquinha() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // States
  const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null);
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  
  const [copiedPix, setCopiedPix] = useState(false);

  // Queries
  const { data: campaigns, isLoading: isLoadingCampaigns } = useListCampaigns();
  const { data: contributions, isLoading: isLoadingContributions } = useListContributions(
    selectedCampaignId || 0,
    { query: { enabled: !!selectedCampaignId } }
  );

  // Mutations
  const createCampaignMut = useCreateCampaign({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        toast({ title: "Sucesso", description: "Campanha criada com sucesso." });
        setIsCampaignFormOpen(false);
      }
    }
  });

  const updateCampaignMut = useUpdateCampaign({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        toast({ title: "Sucesso", description: "Campanha atualizada." });
        setIsCampaignFormOpen(false);
      }
    }
  });

  const deleteCampaignMut = useDeleteCampaign({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        toast({ title: "Sucesso", description: "Campanha removida." });
        setDeletingCampaignId(null);
        if (selectedCampaignId === deletingCampaignId) setSelectedCampaignId(null);
      }
    }
  });

  const createContributionMut = useCreateContribution({
    mutation: {
      onSuccess: () => {
        if (selectedCampaignId) {
          queryClient.invalidateQueries({ queryKey: getListContributionsQueryKey(selectedCampaignId) });
          queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        }
        toast({ title: "Sucesso", description: "Contribuição registrada." });
        setIsContributionFormOpen(false);
      }
    }
  });

  const deleteContributionMut = useDeleteContribution({
    mutation: {
      onSuccess: () => {
        if (selectedCampaignId) {
          queryClient.invalidateQueries({ queryKey: getListContributionsQueryKey(selectedCampaignId) });
          queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        }
        toast({ title: "Sucesso", description: "Contribuição removida." });
      }
    }
  });

  // Forms
  const campaignForm = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { status: "active", goalAmount: 0, startDate: new Date().toISOString().split('T')[0] }
  });

  const contributionForm = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { amount: 0, paymentMethod: "PIX" }
  });

  // Actions
  const openCreateCampaign = () => {
    campaignForm.reset({ 
      title: "", description: "", goalAmount: 0, pixKey: "",
      startDate: new Date().toISOString().split('T')[0], endDate: "", status: "active" 
    });
    setEditingCampaignId(null);
    setIsCampaignFormOpen(true);
  };

  const openEditCampaign = (c: any) => {
    campaignForm.reset({
      title: c.title,
      description: c.description,
      goalAmount: c.goalAmount,
      status: c.status as any,
      startDate: c.startDate.split('T')[0],
      endDate: c.endDate ? c.endDate.split('T')[0] : null,
      pixKey: c.pixKey,
    });
    setEditingCampaignId(c.id);
    setIsCampaignFormOpen(true);
  };

  const onCampaignSubmit = (data: CampaignFormValues) => {
    if (editingCampaignId) updateCampaignMut.mutate({ id: editingCampaignId, data });
    else createCampaignMut.mutate({ data });
  };

  const openCreateContribution = () => {
    contributionForm.reset({ contributorName: "", contributorContact: "", amount: 0, paymentMethod: "PIX", notes: "" });
    setIsContributionFormOpen(true);
  };

  const onContributionSubmit = (data: ContributionFormValues) => {
    if (selectedCampaignId) {
      createContributionMut.mutate({ id: selectedCampaignId, data });
    }
  };

  const handleCopyPix = (pix: string) => {
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    toast({ title: "Chave PIX copiada", description: "Chave copiada para a área de transferência." });
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0">Ativa</Badge>;
      case 'completed': return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 shadow-none border-0">Meta Atingida</Badge>;
      case 'closed': return <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-none border-0">Encerrada</Badge>;
      default: return null;
    }
  };

  const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Vaquinha</h1>
          <p className="text-muted-foreground mt-1">Arrecadação de fundos e campanhas da Casa.</p>
        </div>
        <Button onClick={openCreateCampaign} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl px-6">
          <Plus className="w-5 h-5 mr-2" /> Nova Campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List */}
        <div className={`space-y-4 ${selectedCampaignId ? 'hidden lg:block lg:col-span-1' : 'col-span-1 lg:col-span-3'}`}>
          {isLoadingCampaigns ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
          ) : campaigns?.length === 0 ? (
            <div className="bg-card p-12 rounded-2xl shadow-sm border border-border text-center text-muted-foreground">
              <HandCoins className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhuma campanha</p>
              <p className="text-sm mt-1">Crie sua primeira vaquinha para começar a arrecadar.</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${selectedCampaignId ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {campaigns?.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCampaignId(c.id)}
                  className={`bg-card rounded-2xl shadow-sm border p-5 cursor-pointer transition-all duration-200 group
                    ${selectedCampaignId === c.id 
                      ? 'border-primary ring-1 ring-primary/20 shadow-md' 
                      : 'border-border hover:border-primary/40 hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-bold text-lg text-foreground line-clamp-1">{c.title}</h3>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => openEditCampaign(c)}><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingCampaignId(c.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    {getStatusBadge(c.status)}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {c.contributionsCount} doações
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-primary">{formatCurrency(c.currentAmount)}</span>
                      <span className="text-muted-foreground text-xs">de {formatCurrency(c.goalAmount)}</span>
                    </div>
                    <Progress value={c.progressPercent} className="h-2" />
                    <div className="text-right text-xs font-semibold text-primary/80">{c.progressPercent}%</div>
                  </div>

                  {c.endDate && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-4 pt-4 border-t border-border/50">
                      <Calendar className="w-3.5 h-3.5" /> Encerra em {formatDate(c.endDate)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Detail Panel */}
        {selectedCampaignId && selectedCampaign && (
          <div className="col-span-1 lg:col-span-2 bg-card rounded-2xl shadow-lg shadow-black/5 border border-border flex flex-col h-[calc(100vh-12rem)] min-h-[600px] overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="p-6 border-b border-border/50 bg-gradient-to-br from-background to-secondary/30 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 text-primary/5 rotate-12 pointer-events-none">
                <Target className="w-48 h-48" />
              </div>
              <div className="relative z-10 flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(selectedCampaign.status)}
                    {selectedCampaign.endDate && <span className="text-xs text-muted-foreground">Até {formatDate(selectedCampaign.endDate)}</span>}
                  </div>
                  <h2 className="text-2xl font-display font-bold text-foreground">{selectedCampaign.title}</h2>
                  {selectedCampaign.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{selectedCampaign.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCampaignId(null)} className="lg:hidden rounded-full"><Plus className="w-5 h-5 rotate-45" /></Button>
              </div>

              <div className="mt-6 bg-background p-4 rounded-xl border border-border/50 shadow-sm relative z-10">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Arrecadado</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-display text-primary">{formatCurrency(selectedCampaign.currentAmount)}</span>
                      <span className="text-sm text-muted-foreground font-medium">/ {formatCurrency(selectedCampaign.goalAmount)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {selectedCampaign.progressPercent}%
                    </span>
                  </div>
                </div>
                <Progress value={selectedCampaign.progressPercent} className="h-3 rounded-full" />
              </div>

              {selectedCampaign.pixKey && (
                <div className="mt-4 flex items-center gap-3 bg-secondary/50 p-3 rounded-xl border border-border/50 relative z-10">
                  <div className="bg-background p-2 rounded-lg"><HandCoins className="w-4 h-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Chave PIX</p>
                    <p className="text-sm font-semibold truncate select-all">{selectedCampaign.pixKey}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopyPix(selectedCampaign.pixKey!)} className="rounded-lg h-8 shrink-0">
                    {copiedPix ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    <span className="sr-only">Copiar</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-background">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Contribuições ({selectedCampaign.contributionsCount})
              </h3>
              <Button onClick={openCreateContribution} size="sm" className="rounded-xl bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1.5" /> Nova
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingContributions ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : contributions?.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <HandCoins className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Ainda não há contribuições para esta campanha.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contributions?.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background hover:bg-secondary/20 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-display uppercase shrink-0">
                          {c.contributorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-tight">{c.contributorName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(c.createdAt)} {c.paymentMethod && `• ${c.paymentMethod}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-primary">{formatCurrency(c.amount)}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteContributionMut.mutate({ id: c.id })}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Campaign Form Dialog */}
      <Dialog open={isCampaignFormOpen} onOpenChange={setIsCampaignFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingCampaignId ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          </DialogHeader>
          <Form {...campaignForm}>
            <form onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4 py-4">
              <FormField control={campaignForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Campanha</FormLabel>
                  <FormControl><Input {...field} className="rounded-xl" placeholder="Ex: Reforma do Telhado" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={campaignForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl><textarea {...field} value={field.value || ""} className="w-full min-h-[80px] p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" placeholder="Detalhes da campanha..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={campaignForm.control} name="goalAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="rounded-xl font-bold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={campaignForm.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="completed">Meta Atingida</SelectItem>
                        <SelectItem value="closed">Encerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={campaignForm.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={campaignForm.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim (Opcional)</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ""} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={campaignForm.control} name="pixKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave PIX da Campanha (Opcional)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} className="rounded-xl" placeholder="Email, CPF, Telefone ou Aleatória" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCampaignFormOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={createCampaignMut.isPending || updateCampaignMut.isPending} className="rounded-xl bg-primary text-white">
                  {createCampaignMut.isPending || updateCampaignMut.isPending ? "Salvando..." : "Salvar Campanha"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Dialog */}
      <Dialog open={!!deletingCampaignId} onOpenChange={(open) => !open && setDeletingCampaignId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive font-display">Excluir Campanha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta campanha? Todas as contribuições registradas também serão removidas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCampaignId(null)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingCampaignId && deleteCampaignMut.mutate({ id: deletingCampaignId })} disabled={deleteCampaignMut.isPending} className="rounded-xl">
              {deleteCampaignMut.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribution Form Dialog */}
      <Dialog open={isContributionFormOpen} onOpenChange={setIsContributionFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nova Contribuição</DialogTitle>
            <DialogDescription>Registrar doação para a campanha "{selectedCampaign?.title}"</DialogDescription>
          </DialogHeader>
          <Form {...contributionForm}>
            <form onSubmit={contributionForm.handleSubmit(onContributionSubmit)} className="space-y-4 py-4">
              <FormField control={contributionForm.control} name="contributorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Doador</FormLabel>
                  <FormControl><Input {...field} className="rounded-xl" placeholder="Nome completo ou Apelido" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={contributionForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="rounded-xl font-bold text-primary" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={contributionForm.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "PIX"}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                        <SelectItem value="Transferência">Transferência</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={contributionForm.control} name="contributorContact" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato (Opcional)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} className="rounded-xl" placeholder="Telefone ou Email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={contributionForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem/Observação (Opcional)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} className="rounded-xl" placeholder="Mensagem de apoio..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsContributionFormOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={createContributionMut.isPending} className="rounded-xl bg-primary text-white">
                  {createContributionMut.isPending ? "Registrando..." : "Registrar Doação"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

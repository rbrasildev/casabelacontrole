import { useState } from "react";
import { useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, getListActivitiesQueryKey, useListResidents } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDateTime } from "@/lib/format";
import { 
  CalendarDays, Plus, Clock, CheckCircle2, XCircle, Trash2, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  type: z.enum(["medical", "therapy", "recreation", "administrative", "cleaning", "other"]),
  status: z.enum(["pending", "completed", "cancelled"]),
  scheduledDate: z.string().min(10),
  scheduledTime: z.string().optional().nullable(),
  responsible: z.string().optional().nullable(),
  residentId: z.coerce.number().optional().nullable(),
});

const TYPE_COLORS: Record<string, string> = {
  medical: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  therapy: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  recreation: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  administrative: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  cleaning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  other: "bg-gray-100 text-gray-600 border-gray-200"
};

export function Activities() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: activities } = useListActivities();
  const { data: residents } = useListResidents({ status: "active" });

  const createMut = useCreateActivity({ onSuccess: () => invalidate() });
  const updateMut = useUpdateActivity({ onSuccess: () => invalidate() });
  const deleteMut = useDeleteActivity({ onSuccess: () => invalidate() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
    setIsOpen(false);
  };

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { status: "pending", type: "other", scheduledDate: new Date().toISOString().split('T')[0] }
  });

  const openCreate = () => { form.reset(); setEditingId(null); setIsOpen(true); };
  const openEdit = (a: any) => { 
    form.reset({ ...a, scheduledDate: a.scheduledDate.split('T')[0] }); 
    setEditingId(a.id); setIsOpen(true); 
  };
  const onSubmit = (data: any) => { editingId ? updateMut.mutate({ id: editingId, data }) : createMut.mutate({ data }); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Agenda & Atividades</h1>
          <p className="text-muted-foreground mt-1">Gerencie compromissos médicos, terapias e tarefas.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary rounded-xl"><Plus className="w-5 h-5 mr-2" /> Nova Atividade</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activities?.map(a => (
            <div key={a.id} className="bg-card p-5 rounded-2xl shadow-sm border border-border flex gap-4 relative group hover:shadow-md transition-all">
              <div className="flex flex-col items-center justify-center bg-secondary/50 rounded-xl min-w-[70px] h-full border border-border shadow-inner">
                <span className="text-xs font-bold text-primary uppercase">{new Date(a.scheduledDate).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                <span className="text-2xl font-bold font-display text-foreground leading-none">{new Date(a.scheduledDate).getDate()}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-foreground">{a.title}</h3>
                  <Badge variant="outline" className={TYPE_COLORS[a.type]}>{a.type}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-1"/> {a.scheduledTime || 'Horário livre'}</span>
                  {a.residentName && <span className="flex items-center bg-primary/5 text-primary px-2 rounded-md font-medium">{a.residentName}</span>}
                </div>
                {a.description && <p className="text-sm mt-2 opacity-80">{a.description}</p>}
              </div>
              
              <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {a.status === 'pending' && (
                  <Button size="sm" variant="outline" className="h-8 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" onClick={() => updateMut.mutate({ id: a.id, data: { ...a, status: 'completed' } })}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Concluir
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}><Edit className="w-4 h-4 text-muted-foreground" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/10 text-destructive" onClick={() => deleteMut.mutate({ id: a.id })}><Trash2 className="w-4 h-4" /></Button>
              </div>

              {a.status === 'completed' && <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r-2xl"></div>}
            </div>
          ))}
          {(!activities || activities.length === 0) && (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border"><CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p>Nenhuma atividade agendada.</p></div>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar Atividade" : "Nova Atividade"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                  <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                  <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} value={field.value||""} className="rounded-xl" /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="medical">Consulta Médica</SelectItem>
                        <SelectItem value="therapy">Terapia</SelectItem>
                        <SelectItem value="recreation">Recreação</SelectItem>
                        <SelectItem value="administrative">Administrativo</SelectItem>
                        <SelectItem value="cleaning">Limpeza/Manutenção</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="residentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residente Relacionado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {residents?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full rounded-xl mt-4">Salvar Atividade</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

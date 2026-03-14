import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowLeft, Camera, Upload, FileText, Trash2, Download,
  Phone, Calendar, MapPin, DollarSign, AlertTriangle, User,
  Edit, Save, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

interface ResidentDoc {
  id: number;
  residentId: number;
  name: string;
  objectPath: string;
  contentType: string | null;
  size: number | null;
  createdAt: string;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFileToStorage(file: File): Promise<{ objectPath: string }> {
  const res = await fetch(`${BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });

  if (!res.ok) {
    throw new Error("Erro ao solicitar URL de upload");
  }

  const { uploadURL, objectPath } = await res.json();

  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Erro ao enviar arquivo");
  }

  return { objectPath };
}

export function ResidentProfile() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/residentes/:id");
  const residentId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [selectedDocFiles, setSelectedDocFiles] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: resident, isLoading } = useQuery({
    queryKey: ["/api/residents", residentId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/residents/${residentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Residente não encontrado");
      return res.json();
    },
    enabled: !!residentId,
  });

  const { data: documents = [] } = useQuery<ResidentDoc[]>({
    queryKey: ["/api/residents", residentId, "documents"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/residents/${residentId}/documents`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!residentId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${BASE}/api/residents/${residentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents", residentId] });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: number) => {
      const res = await fetch(`${BASE}/api/residents/${residentId}/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao excluir documento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/residents", residentId, "documents"] });
      toast({ title: "Documento excluído com sucesso" });
      setDeleteDocId(null);
    },
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const { objectPath } = await uploadFileToStorage(file);
      await updateMutation.mutateAsync({ photoUrl: objectPath });
      toast({ title: "Foto atualizada com sucesso!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function handleDocFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setSelectedDocFiles(Array.from(files));
    setDocName("");
    setIsDocDialogOpen(true);
    if (docInputRef.current) docInputRef.current.value = "";
  }

  async function handleDocUploadConfirm() {
    if (!selectedDocFiles.length || !docName.trim()) return;

    setIsUploadingDoc(true);
    setIsDocDialogOpen(false);
    try {
      for (const file of selectedDocFiles) {
        const { objectPath } = await uploadFileToStorage(file);
        const res = await fetch(`${BASE}/api/residents/${residentId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: docName.trim(),
            objectPath,
            contentType: file.type,
            size: file.size,
          }),
        });
        if (!res.ok) throw new Error("Erro ao salvar documento");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/residents", residentId, "documents"] });
      toast({ title: "Documento anexado com sucesso!" });
    } catch {
      toast({ title: "Erro ao enviar documento", variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
      setSelectedDocFiles([]);
      setDocName("");
    }
  }

  function handleSaveNotes() {
    updateMutation.mutate({ notes: editNotes }, {
      onSuccess: () => {
        setIsEditingNotes(false);
        toast({ title: "Observações atualizadas" });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Residente não encontrado.</p>
        <Button variant="link" onClick={() => navigate("/residentes")}>Voltar para Residentes</Button>
      </div>
    );
  }

  const initials = resident.name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const photoSrc = resident.photoUrl
    ? `${BASE}/api/storage${resident.photoUrl}`
    : null;

  const age = resident.dateOfBirth
    ? Math.floor((Date.now() - new Date(resident.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/residentes")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar para Residentes
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="relative group">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                {photoSrc && <AvatarImage src={photoSrc} alt={resident.name} />}
                <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              >
                {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <h2 className="text-xl font-bold mt-4">{resident.name}</h2>
            <Badge
              variant={resident.status === "active" ? "default" : "secondary"}
              className={resident.status === "active"
                ? "mt-2 bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
                : "mt-2"
              }
            >
              {resident.status === "active" ? "Ativo" : "Alta / Inativo"}
            </Badge>

            {age !== null && (
              <p className="text-sm text-muted-foreground mt-2">{age} anos</p>
            )}

            <div className="w-full mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-secondary rounded-lg"><User className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-medium">{resident.cpf}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-secondary rounded-lg"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{resident.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-secondary rounded-lg"><Calendar className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium">{formatDate(resident.dateOfBirth)}</p>
                </div>
              </div>
              {(resident.address || resident.city || resident.state) && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-secondary rounded-lg"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="font-medium">
                      {[resident.address, resident.city, resident.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-secondary rounded-lg"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Quarto</p>
                  <p className="font-medium">{resident.room || "Não definido"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-secondary rounded-lg"><DollarSign className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Mensalidade</p>
                  <p className="font-medium">{formatCurrency(resident.monthlyFee)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Informações de Entrada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data de Entrada</p>
                  <p className="font-medium">{formatDate(resident.entryDate)}</p>
                </div>
                {resident.exitDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Data de Saída</p>
                    <p className="font-medium">{formatDate(resident.exitDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Contato de Emergência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nome</p>
                  <p className="font-medium">{resident.emergencyContact}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                  <p className="font-medium">{resident.emergencyPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Observações</CardTitle>
              {!isEditingNotes ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditNotes(resident.notes || ""); setIsEditingNotes(true); }}
                >
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-1" /> Salvar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full min-h-[120px] p-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  placeholder="Observações médicas, cuidados especiais, alergias..."
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {resident.notes || "Nenhuma observação cadastrada."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documentos ({documents.length})
              </CardTitle>
              <Button
                size="sm"
                onClick={() => docInputRef.current?.click()}
                disabled={isUploadingDoc}
                className="gap-2"
              >
                {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Anexar Documento
              </Button>
              <input
                ref={docInputRef}
                type="file"
                onChange={handleDocFileSelect}
                className="hidden"
              />
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum documento anexado.</p>
                  <p className="text-xs mt-1">Clique em "Anexar Documento" para adicionar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a
                            href={`${BASE}/api/storage${doc.objectPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDocId(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDocDialogOpen} onOpenChange={(open) => {
        if (!open) { setIsDocDialogOpen(false); setSelectedDocFiles([]); setDocName(""); }
      }}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Anexar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="docName">Nome / Descrição do Documento</Label>
              <Input
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Ex: RG, CPF, Laudo Médico, Receita..."
                className="mt-1.5 rounded-xl"
                autoFocus
              />
            </div>
            {selectedDocFiles.length > 0 && (
              <div className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                <p className="font-medium text-foreground mb-1">Arquivo selecionado:</p>
                {selectedDocFiles.map((f, i) => (
                  <p key={i} className="truncate">{f.name} ({formatFileSize(f.size)})</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDocDialogOpen(false); setSelectedDocFiles([]); setDocName(""); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleDocUploadConfirm} disabled={!docName.trim() || isUploadingDoc} className="rounded-xl">
              {isUploadingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocId && deleteDocMutation.mutate(deleteDocId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useRef } from "react";
import { useGetSettings, useUpdateSettings, useUploadLogo, useConfirmLogoUpload, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Phone, Mail, MapPin, Globe, Instagram, Facebook, QrCode,
  Upload, Loader2, Save, Image as ImageIcon, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetSettings();
  const updateMut = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Sucesso", description: "Configurações salvas com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro", description: "Falha ao salvar configurações.", variant: "destructive" });
      },
    },
  });
  const uploadLogoMut = useUploadLogo();
  const confirmLogoMut = useConfirmLogoUpload();

  const [form, setForm] = useState<Record<string, string | null>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  if (settings && !initialized) {
    setForm({ ...settings });
    setInitialized(true);
  }

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleSave = () => {
    updateMut.mutate({ data: form as any });
  };

  const handleImageUpload = async (file: File, type: "logo" | "favicon") => {
    const setUploading = type === "logo" ? setLogoUploading : setFaviconUploading;
    setUploading(true);
    try {
      const uploadRes = await uploadLogoMut.mutateAsync({ data: { type } });
      const { uploadUrl, objectPath, settingKey } = uploadRes;

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const confirmRes = await confirmLogoMut.mutateAsync({ data: { objectPath, settingKey } });
      setForm((prev) => ({ ...prev, [settingKey]: confirmRes.path ?? null }));
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "Sucesso", description: `${type === "logo" ? "Logo" : "Favicon"} atualizado com sucesso.` });
    } catch {
      toast({ title: "Erro", description: "Falha no upload da imagem.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (settingKey: string) => {
    setForm((prev) => ({ ...prev, [settingKey]: null }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Dados da instituição, logos e informações de contato.</p>
        </div>
        <Button onClick={handleSave} disabled={updateMut.isPending} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
          {updateMut.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-secondary/50 rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="geral" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-4 py-2">
            <Building2 className="w-4 h-4 mr-2" />
            Dados Gerais
          </TabsTrigger>
          <TabsTrigger value="imagens" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-4 py-2">
            <ImageIcon className="w-4 h-4 mr-2" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="contato" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm px-4 py-2">
            <Phone className="w-4 h-4 mr-2" />
            Contato & Redes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-display font-semibold text-foreground">Informações da Instituição</h2>
              <p className="text-sm text-muted-foreground">Dados básicos que aparecerão no sistema e em relatórios.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />Nome da Instituição</Label>
                <Input
                  value={form.org_name || ""}
                  onChange={(e) => updateField("org_name", e.target.value)}
                  placeholder="Ex: Casa de Apoio São José"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descrição / Sobre</Label>
                <Textarea
                  value={form.org_description || ""}
                  onChange={(e) => updateField("org_description", e.target.value)}
                  placeholder="Breve descrição da instituição..."
                  className="rounded-xl min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={form.org_cnpj || ""}
                  onChange={(e) => updateField("org_cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><QrCode className="w-4 h-4 text-primary" />Chave PIX</Label>
                <Input
                  value={form.org_pix_key || ""}
                  onChange={(e) => updateField("org_pix_key", e.target.value)}
                  placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço Completo</Label>
                  <Input
                    value={form.org_address || ""}
                    onChange={(e) => updateField("org_address", e.target.value)}
                    placeholder="Rua, número, complemento, bairro"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={form.org_city || ""}
                    onChange={(e) => updateField("org_city", e.target.value)}
                    placeholder="Cidade"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={form.org_state || ""}
                      onChange={(e) => updateField("org_state", e.target.value)}
                      placeholder="UF"
                      className="rounded-xl"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={form.org_zip || ""}
                      onChange={(e) => updateField("org_zip", e.target.value)}
                      placeholder="00000-000"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="imagens" className="mt-6">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-display font-semibold text-foreground">Logotipo e Imagens</h2>
              <p className="text-sm text-muted-foreground">Logo principal e favicon que aparecem na interface do sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Logo Principal</Label>
                <p className="text-xs text-muted-foreground">Aparece na barra lateral e em relatórios. Recomendado: PNG com fundo transparente.</p>
                <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] bg-secondary/20">
                  {form.org_logo ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border">
                        <img src={form.org_logo} alt="Logo" className="max-h-24 max-w-[200px] object-contain" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                        >
                          {logoUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          Trocar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveImage("org_logo")}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                    >
                      {logoUploading ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10" />
                      )}
                      <span className="text-sm font-medium">Clique para enviar o logo</span>
                      <span className="text-xs">PNG, JPG ou SVG (máx 2MB)</span>
                    </button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "logo");
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Favicon</Label>
                <p className="text-xs text-muted-foreground">Ícone pequeno que aparece na aba do navegador. Recomendado: PNG quadrado 64x64.</p>
                <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] bg-secondary/20">
                  {form.org_favicon ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border">
                        <img src={form.org_favicon} alt="Favicon" className="h-16 w-16 object-contain" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={faviconUploading}
                        >
                          {faviconUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          Trocar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveImage("org_favicon")}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={faviconUploading}
                    >
                      {faviconUploading ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10" />
                      )}
                      <span className="text-sm font-medium">Clique para enviar o favicon</span>
                      <span className="text-xs">PNG quadrado (64x64 recomendado)</span>
                    </button>
                  )}
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "favicon");
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contato" className="mt-6">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-display font-semibold text-foreground">Contato e Redes Sociais</h2>
              <p className="text-sm text-muted-foreground">Informações de contato e links de redes sociais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />Telefone</Label>
                <Input
                  value={form.org_phone || ""}
                  onChange={(e) => updateField("org_phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />E-mail</Label>
                <Input
                  value={form.org_email || ""}
                  onChange={(e) => updateField("org_email", e.target.value)}
                  placeholder="contato@casadeapoio.com"
                  className="rounded-xl"
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />Website</Label>
                <Input
                  value={form.org_website || ""}
                  onChange={(e) => updateField("org_website", e.target.value)}
                  placeholder="https://www.casadeapoio.com"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500" />Instagram</Label>
                <Input
                  value={form.org_instagram || ""}
                  onChange={(e) => updateField("org_instagram", e.target.value)}
                  placeholder="@casadeapoio"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" />Facebook</Label>
                <Input
                  value={form.org_facebook || ""}
                  onChange={(e) => updateField("org_facebook", e.target.value)}
                  placeholder="https://facebook.com/casadeapoio"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

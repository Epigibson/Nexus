"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { ApiKeyResponse } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  Smartphone,
  Moon,
  Sun,
  Monitor,
  Check,
  Lock,
  Loader2,
  Save,
  Key,
  Copy,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Terminal,
  KeyRound,
  ShieldOff,
  Palette,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, refreshProfile, setupTotp, verifyTotp, getMfaStatus, disableMfa } = useAuth();
  const [name, setName] = useState(user?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [newKeyName, setNewKeyName] = useState("CLI Key");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaSetupMode, setMfaSetupMode] = useState(false);
  const [mfaQrUri, setMfaQrUri] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaDisabling, setMfaDisabling] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    loadApiKeys();
    loadMfaStatus();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await api.listApiKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error("Error loading API keys:", err);
    }
  };

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const result = await api.generateApiKey(newKeyName);
      setGeneratedKey(result.full_key);
      setNewKeyName("CLI Key");
      await loadApiKeys();
    } catch (err) {
      console.error("Error generating API key:", err);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await api.revokeApiKey(keyId);
      await loadApiKeys();
      setGeneratedKey(null);
    } catch (err) {
      console.error("Error revoking API key:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.updateProfile({ display_name: name });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── MFA Handlers ──

  const loadMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const status = await getMfaStatus();
      setMfaEnabled(status.enabled);
    } catch {
      setMfaEnabled(false);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    try {
      const result = await setupTotp();
      setMfaQrUri(result.qrCodeUri);
      setMfaSecret(result.secretKey);
      setMfaSetupMode(true);
      setMfaCode("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar configuración 2FA");
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaCode.length !== 6) return;
    setMfaVerifying(true);
    try {
      await verifyTotp(mfaCode);
      setMfaEnabled(true);
      setMfaSetupMode(false);
      setMfaQrUri("");
      setMfaSecret("");
      setMfaCode("");
      toast.success("¡Autenticación de 2 pasos activada!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Código inválido, intenta de nuevo");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    setMfaDisabling(true);
    try {
      await disableMfa();
      setMfaEnabled(false);
      toast.success("Autenticación de 2 pasos desactivada");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al desactivar 2FA");
    } finally {
      setMfaDisabling(false);
    }
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(mfaSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const initials = user?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("") || "?";

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">
          Gestiona tu perfil, seguridad y preferencias.
        </p>
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Apariencia
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: Perfil                                */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="profile">
          <Card className="glass bg-card/40 border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 hover:border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Actualiza tu nombre y datos de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/15 text-primary text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{user?.display_name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="uppercase text-[10px]">
                    {user?.plan || "free"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="mr-1 inline h-3.5 w-3.5" />
                    Email
                  </Label>
                  <Input id="email" defaultValue={user?.email} disabled />
                </div>
              </div>

              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: Seguridad                             */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="security" className="space-y-6">

          {/* ── 2FA ── */}
          <Card className="glass bg-card/40 border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 hover:border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" />
                    Autenticación de 2 Pasos (2FA)
                  </CardTitle>
                  <CardDescription>
                    Protege tu cuenta con un código temporal desde tu app autenticadora.
                  </CardDescription>
                </div>
                {!mfaLoading && (
                  <Badge
                    variant={mfaEnabled ? "default" : "secondary"}
                    className={`shrink-0 text-[10px] uppercase ${mfaEnabled ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  >
                    {mfaEnabled ? "Activo" : "Inactivo"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mfaLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando estado de 2FA...
                </div>
              ) : mfaEnabled && !mfaSetupMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Tu cuenta está protegida</div>
                      <div className="text-xs text-muted-foreground">
                        Se requiere un código de tu app autenticadora en cada inicio de sesión.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisableMfa}
                    disabled={mfaDisabling}
                    className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {mfaDisabling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldOff className="h-3.5 w-3.5" />
                    )}
                    {mfaDisabling ? "Desactivando..." : "Desactivar 2FA"}
                  </Button>
                </div>
              ) : mfaSetupMode ? (
                <div className="space-y-5 animate-in slide-in-from-top-4 fade-in duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">1</div>
                      Escanea el código QR con tu app autenticadora
                    </div>
                    <div className="flex flex-col items-center gap-4 rounded-lg border border-border p-5 bg-background/50">
                      <div className="rounded-xl bg-white p-3 shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrUri)}`}
                          alt="QR Code para 2FA"
                          className="h-[200px] w-[200px]"
                        />
                      </div>
                      <div className="text-center space-y-2 w-full">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          Google Authenticator, Authy, 1Password, etc.
                        </p>
                        <Separator />
                        <p className="text-xs text-muted-foreground">¿No puedes escanear? Ingresa esta clave manualmente:</p>
                        <div className="flex gap-2 items-center justify-center">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">{mfaSecret}</code>
                          <Button variant="ghost" size="sm" onClick={handleCopySecret} className="h-7 w-7 p-0 shrink-0">
                            {secretCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">2</div>
                      Ingresa el código de 6 dígitos para verificar
                    </div>
                    <div className="flex gap-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                        className="text-center text-xl tracking-[0.2em] h-12 font-mono max-w-[200px]"
                      />
                      <Button
                        onClick={handleVerifyMfa}
                        disabled={mfaCode.length !== 6 || mfaVerifying}
                        className="gap-2 h-12"
                      >
                        {mfaVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        {mfaVerifying ? "Verificando..." : "Activar 2FA"}
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setMfaSetupMode(false); setMfaCode(""); }}
                    className="text-muted-foreground"
                  >
                    ← Cancelar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <Shield className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Agrega una capa extra de seguridad</div>
                      <div className="text-xs text-muted-foreground">
                        Usa una app autenticadora para generar códigos temporales al iniciar sesión.
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleStartMfaSetup} className="gap-2">
                    <KeyRound className="h-3.5 w-3.5" />
                    Configurar 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── API Keys ── */}
          <Card className="glass bg-card/40 border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 hover:border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription>
                Genera API keys para conectar el CLI de Nexus con la nube.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="keyName">Nombre de la key</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="CLI Key, CI/CD, etc."
                  />
                </div>
                <Button onClick={handleGenerateKey} disabled={generatingKey} className="gap-2">
                  {generatingKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Generar Key
                </Button>
              </div>

              {generatedKey && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Shield className="h-4 w-4" />
                    ¡API Key generada! Cópiala ahora — no se mostrará de nuevo.
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={showKey ? generatedKey : "ag_live_" + "•".repeat(40)}
                        readOnly
                        className="font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopyKey} className="gap-2 shrink-0">
                      {keyCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {keyCopied ? "¡Copiada!" : "Copiar"}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Terminal className="inline h-3 w-3 mr-1" />
                    Usa: <code className="text-primary">nexus login</code> y pega esta key.
                  </div>
                </div>
              )}

              {apiKeys.length > 0 && (
                <div className="space-y-2">
                  <Label>Keys activas</Label>
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{key.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {key.key_prefix}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {key.last_used_at
                            ? `Último uso: ${new Date(key.last_used_at).toLocaleDateString()}`
                            : "Nunca usada"}
                          {" · "}
                          Creada: {new Date(key.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Encryption Info ── */}
          <div className="flex items-center gap-3 rounded-lg border border-border/50 glass bg-card/40 p-4">
            <Lock className="h-4 w-4 text-emerald-500" />
            <div>
              <div className="text-xs font-medium">Encriptación AES-256-GCM</div>
              <div className="text-xs text-muted-foreground">
                Secretos encriptados en la nube con Argon2id key derivation.
              </div>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
              ACTIVO
            </Badge>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════ */}
        {/* TAB: Apariencia                            */}
        {/* ═══════════════════════════════════════════ */}
        <TabsContent value="appearance">
          <Card className="glass bg-card/40 border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-violet-900/10 hover:border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Tema
              </CardTitle>
              <CardDescription>Personaliza el tema visual del dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {[
                  { value: "light", icon: Sun, label: "Claro", desc: "Fondo claro" },
                  { value: "dark", icon: Moon, label: "Oscuro", desc: "Fondo oscuro" },
                  { value: "system", icon: Monitor, label: "Sistema", desc: "Automático" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                      theme === opt.value
                        ? "border-primary bg-primary/5 shadow-md shadow-violet-900/10"
                        : "border-border/50 hover:border-primary/30 hover:bg-card/60"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${
                      theme === opt.value
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                    </div>
                    {theme === opt.value && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

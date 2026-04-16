"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  X,
  Sparkles,
} from "lucide-react";

// ─── Main Modal Component ───

export default function StripeCheckoutModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [config, subscription] = await Promise.all([
        api.getStripeConfig(),
        api.createSubscription(),
      ]);

      setStripePromise(loadStripe(config.publishable_key));
      setClientSecret(subscription.client_secret);
    } catch (err) {
      console.error("Checkout init error:", err);
      setError(
        err instanceof Error ? err.message : "Error al iniciar el checkout."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      initCheckout();
    } else {
      setClientSecret(null);
      setError(null);
    }
  }, [open, initCheckout]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header gradient bar */}
        <div className="h-1 w-full gradient-violet shrink-0" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-5 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-violet text-white shadow-lg shadow-primary/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Upgrade a Premium</h2>
            <p className="text-sm text-muted-foreground">
              {user?.email && (
                <span className="font-mono text-xs">{user.email}</span>
              )}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Preparando checkout seguro...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive w-full">
                {error}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={onClose}
                >
                  Cerrar
                </button>
                <button
                  className="flex-1 rounded-lg gradient-violet text-white px-4 py-2 text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  onClick={initCheckout}
                >
                  <Loader2 className="h-4 w-4" />
                  Reintentar
                </button>
              </div>
            </div>
          ) : clientSecret && stripePromise ? (
            <div id="checkout" className="rounded-xl overflow-hidden">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

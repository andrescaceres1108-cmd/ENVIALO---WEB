"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema } from "@/lib/validation";

type Status = "checking" | "ready" | "invalid";

export default function ActualizarPasswordView() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const hashError = params.get("error_description") ?? params.get("error");

      if (accessToken && refreshToken) {
        window.history.replaceState(null, "", window.location.pathname);
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          setStatus(error ? "invalid" : "ready");
        } catch {
          setStatus("invalid");
        }
        return;
      }

      if (hashError) {
        window.history.replaceState(null, "", window.location.pathname);
        setStatus("invalid");
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setStatus(session ? "ready" : "invalid");
      } catch {
        setStatus("invalid");
      }
    }

    checkSession();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setMessage(undefined);

    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData);
    const parsed = updatePasswordSchema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const fieldErrors: Record<string, string> = {};
      for (const key in flat) {
        const arr = flat[key as keyof typeof flat];
        if (arr && arr[0]) fieldErrors[key] = arr[0];
      }
      setErrors(fieldErrors);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setPending(false);

    if (error) {
      setMessage("No se pudo actualizar la contraseña. Intenta de nuevo.");
      setOk(false);
      return;
    }

    setOk(true);
    setMessage("Contraseña actualizada.");
  }

  useEffect(() => {
    if (ok) {
      const t = setTimeout(() => {
        router.push("/cuenta");
        router.refresh();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [ok, router]);

  useEffect(() => {
    if (status === "invalid") {
      router.replace("/cuenta?error=enlace_invalido");
    }
  }, [status, router]);

  if (status === "checking") {
    return (
      <div className="section-head">
        <h2>Actualizar contraseña</h2>
        <p>Verificando tu enlace…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="section-head">
        <h2>Actualizar contraseña</h2>
        <p>Redirigiendo…</p>
      </div>
    );
  }

  return (
    <>
      <div className="section-head">
        <h2>Actualizar contraseña</h2>
        <p>Elige una nueva contraseña para tu cuenta de SendGO.</p>
      </div>
      <div className="card-form">
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="password">Nueva contraseña</label>
            <input id="password" name="password" type="password" minLength={8} required />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          <div className="field">
            <label htmlFor="confirmar">Confirmar contraseña</label>
            <input id="confirmar" name="confirmar" type="password" minLength={8} required />
            {errors.confirmar && <p className="field-error">{errors.confirmar}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar contraseña"}
          </button>
          {message && <p className={`form-msg ${ok ? "ok" : "err"}`}>{message}</p>}
        </form>
      </div>
    </>
  );
}

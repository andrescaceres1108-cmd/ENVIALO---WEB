"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { actualizarPasswordAction, type ActionState } from "@/lib/actions";

const initialState: ActionState = { ok: false };

export default function ActualizarPasswordView() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    actualizarPasswordAction,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => {
        router.push("/cuenta");
        router.refresh();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  return (
    <>
      <div className="section-head">
        <h2>Actualizar contraseña</h2>
        <p>Elige una nueva contraseña para tu cuenta de SendGO.</p>
      </div>
      <div className="card-form">
        <form action={formAction} noValidate>
          <div className="field">
            <label htmlFor="password">Nueva contraseña</label>
            <input id="password" name="password" type="password" minLength={8} required />
            {state.errors?.password && (
              <p className="field-error">{state.errors.password}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="confirmar">Confirmar contraseña</label>
            <input id="confirmar" name="confirmar" type="password" minLength={8} required />
            {state.errors?.confirmar && (
              <p className="field-error">{state.errors.confirmar}</p>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar contraseña"}
          </button>
          {state.message && (
            <p className={`form-msg ${state.ok ? "ok" : "err"}`}>{state.message}</p>
          )}
        </form>
      </div>
    </>
  );
}

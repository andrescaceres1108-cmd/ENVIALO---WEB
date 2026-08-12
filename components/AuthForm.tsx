"use client";

import { useActionState, useEffect, useState } from "react";
import { signUpAction, logInAction, type ActionState } from "@/lib/actions";
import SegmentedControl from "@/components/SegmentedControl";

const initialState: ActionState = { ok: false };

export default function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [pais, setPais] = useState<"usa" | "co">("usa");
  const [signupState, signupFormAction, signupPending] = useActionState(
    signUpAction,
    initialState
  );
  const [loginState, loginFormAction, loginPending] = useActionState(
    logInAction,
    initialState
  );

  useEffect(() => {
    if (signupState.ok) onSuccess?.();
  }, [signupState.ok, onSuccess]);

  useEffect(() => {
    if (loginState.ok) onSuccess?.();
  }, [loginState.ok, onSuccess]);

  return (
    <div>
      <div className="seg" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={tab === "signup" ? "on" : ""}
          onClick={() => setTab("signup")}
        >
          CREAR CUENTA
        </button>
        <button
          type="button"
          className={tab === "login" ? "on" : ""}
          onClick={() => setTab("login")}
        >
          INICIAR SESIÓN
        </button>
      </div>

      {tab === "signup" ? (
        <form action={signupFormAction} noValidate>
          <div className="field">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" name="nombre" placeholder="Ej: Andrés G." required />
            {signupState.errors?.nombre && (
              <p className="field-error">{signupState.errors.nombre}</p>
            )}
          </div>

          <div className="field">
            <label>País desde donde te registras</label>
            <input type="hidden" name="pais" value={pais} />
            <SegmentedControl
              value={pais}
              onChange={setPais}
              options={[
                { value: "usa", label: "USA" },
                { value: "co", label: "COLOMBIA" },
              ]}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" name="email" type="email" required />
              {signupState.errors?.email && (
                <p className="field-error">{signupState.errors.email}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" minLength={8} required />
              {signupState.errors?.password && (
                <p className="field-error">{signupState.errors.password}</p>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="telefono">
              Teléfono / WhatsApp <span className="opt">— con código de país</span>
            </label>
            <input id="telefono" name="telefono" type="tel" placeholder="Ej: +1 703 555 0123" required />
            {signupState.errors?.telefono && (
              <p className="field-error">{signupState.errors.telefono}</p>
            )}
          </div>

          {pais === "co" && (
            <div className="field">
              <label htmlFor="cedula">Cédula de ciudadanía</label>
              <input id="cedula" name="cedula" placeholder="Ej: 1020304050" required />
              {signupState.errors?.cedula && (
                <p className="field-error">{signupState.errors.cedula}</p>
              )}
              <p className="field-hint">
                Solo se usa para identificarte en la plataforma. SendGO no la comparte con terceros.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-sm" disabled={signupPending}>
            {signupPending ? "Creando cuenta…" : "Crear cuenta"}
          </button>
          {signupState.message && (
            <p className={`form-msg ${signupState.ok ? "ok" : "err"}`}>{signupState.message}</p>
          )}
        </form>
      ) : (
        <form action={loginFormAction} noValidate>
          <div className="field">
            <label htmlFor="login-email">Correo</label>
            <input id="login-email" name="email" type="email" required />
            {loginState.errors?.email && <p className="field-error">{loginState.errors.email}</p>}
          </div>
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type="password" required />
            {loginState.errors?.password && (
              <p className="field-error">{loginState.errors.password}</p>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loginPending}>
            {loginPending ? "Ingresando…" : "Iniciar sesión"}
          </button>
          {loginState.message && (
            <p className={`form-msg ${loginState.ok ? "ok" : "err"}`}>{loginState.message}</p>
          )}
        </form>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import {
  signUpAction,
  logInAction,
  forgotPasswordAction,
  resendConfirmationAction,
  type ActionState,
} from "@/lib/actions";
import SegmentedControl from "@/components/SegmentedControl";

const initialState: ActionState = { ok: false };

export default function AuthForm({
  onSuccess,
  redirectTo,
}: {
  onSuccess?: () => void;
  // Si se pasa, el login/signup exitoso navega server-side a esta ruta
  // (evita la carrera entre el revalidatePath del layout y un router.push
  // hecho desde un useEffect en el cliente). Si se omite, no navega solo
  // — útil para flujos tipo modal que deben quedarse en la misma página.
  redirectTo?: string | null;
}) {
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [pais, setPais] = useState<"usa" | "co">("usa");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [signupState, signupFormAction, signupPending] = useActionState(
    signUpAction.bind(null, redirectTo ?? null),
    initialState
  );
  const [loginState, loginFormAction, loginPending] = useActionState(
    logInAction.bind(null, redirectTo ?? null),
    initialState
  );
  const [forgotState, forgotFormAction, forgotPending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  useEffect(() => {
    if (signupState.ok && !signupState.requiresConfirmation) onSuccess?.();
  }, [signupState.ok, signupState.requiresConfirmation, onSuccess]);

  useEffect(() => {
    if (loginState.ok) onSuccess?.();
  }, [loginState.ok, onSuccess]);

  async function handleResend() {
    if (!loginEmail) return;
    setResendPending(true);
    setResendMsg(null);
    const res = await resendConfirmationAction(loginEmail);
    setResendPending(false);
    setResendMsg(res.message ?? null);
  }

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
            <input id="nombre" name="nombre" required />
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

          <div className="field">
            <div className="check">
              <input type="checkbox" id="acepto_terminos" name="acepto_terminos" required />
              <span>
                Acepto los{" "}
                <a href="/terminos" target="_blank" rel="noopener noreferrer">
                  Términos y condiciones
                </a>{" "}
                y la{" "}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer">
                  Política de privacidad
                </a>
                .
              </span>
            </div>
            {signupState.errors?.acepto_terminos && (
              <p className="field-error">{signupState.errors.acepto_terminos}</p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-sm" disabled={signupPending}>
            {signupPending ? "Creando cuenta…" : "Crear cuenta"}
          </button>
          {signupState.message && (
            <p className={`form-msg ${signupState.ok ? "ok" : "err"}`}>{signupState.message}</p>
          )}
        </form>
      ) : forgotOpen ? (
        <form action={forgotFormAction} noValidate>
          <div className="field">
            <label htmlFor="forgot-email">Correo</label>
            <input id="forgot-email" name="email" type="email" required />
            {forgotState.errors?.email && (
              <p className="field-error">{forgotState.errors.email}</p>
            )}
            <p className="field-hint">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={forgotPending}>
            {forgotPending ? "Enviando…" : "Enviar enlace"}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => setForgotOpen(false)}
            style={{ marginLeft: 10 }}
          >
            Volver a iniciar sesión
          </button>
          {forgotState.message && (
            <p className={`form-msg ${forgotState.ok ? "ok" : "err"}`}>{forgotState.message}</p>
          )}
        </form>
      ) : (
        <form action={loginFormAction} noValidate>
          <div className="field">
            <label htmlFor="login-email">Correo</label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            {loginState.errors?.email && <p className="field-error">{loginState.errors.email}</p>}
          </div>
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            {loginState.errors?.password && (
              <p className="field-error">{loginState.errors.password}</p>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loginPending}>
            {loginPending ? "Ingresando…" : "Iniciar sesión"}
          </button>
          <button type="button" className="link-btn" onClick={() => setForgotOpen(true)}>
            ¿Olvidaste tu contraseña?
          </button>
          {loginState.message && (
            <p className={`form-msg ${loginState.ok ? "ok" : "err"}`}>{loginState.message}</p>
          )}
          {loginState.unconfirmed && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="link-btn"
                onClick={handleResend}
                disabled={resendPending || !loginEmail}
              >
                {resendPending ? "Reenviando…" : "Reenviar correo de confirmación"}
              </button>
              {resendMsg && <p className="form-msg ok">{resendMsg}</p>}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

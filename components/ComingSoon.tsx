import AuthForm from "@/components/AuthForm";

// Página que ve todo el mundo (menos el admin) mientras el sitio está en
// modo privado (ver lib/site-config.ts). El acceso del administrador va
// en un <details> discreto: al iniciar sesión con la cuenta admin, el
// sitio completo aparece.
export default function ComingSoon() {
  return (
    <main>
      <div className="empty" style={{ marginTop: 80, marginBottom: 40 }}>
        <div className="big">SendGO</div>
        <p style={{ maxWidth: 480, margin: "12px auto 0" }}>
          Estamos preparando el lanzamiento. Muy pronto vas a poder conectar
          viajeros con espacio en su maleta con personas que necesitan enviar
          cosas entre USA y Colombia.
        </p>
        <details style={{ marginTop: 40 }}>
          <summary
            style={{ cursor: "pointer", fontSize: ".8rem", opacity: 0.6 }}
          >
            Acceso del administrador
          </summary>
          <div style={{ maxWidth: 420, margin: "24px auto 0", textAlign: "left" }}>
            <AuthForm redirectTo="/" initialTab="login" />
          </div>
        </details>
      </div>
    </main>
  );
}

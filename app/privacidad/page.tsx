export default function PrivacidadPage() {
  return (
    <>
      <div className="section-head">
        <h2>Política de privacidad</h2>
        <p>Borrador — última actualización: agosto de 2026.</p>
      </div>

      <div className="legal">
        <div className="warn">
          <strong>Nota:</strong> este es un borrador inicial redactado para el
          MVP de SendGO. Antes de operar públicamente, debe ser revisado por
          un abogado con experiencia en protección de datos en EE.UU. y
          Colombia.
        </div>

        <h3>1. Qué datos recopilamos</h3>
        <ul>
          <li>
            <b>Datos de cuenta:</b> nombre completo, correo electrónico,
            contraseña (almacenada de forma cifrada), país de registro y
            teléfono / WhatsApp.
          </li>
          <li>
            <b>Cédula de ciudadanía:</b> solo para cuentas creadas desde
            Colombia, con el fin de identificarte dentro de la plataforma.
          </li>
          <li>
            <b>Datos de los anuncios:</b> ciudades de origen y destino, fecha
            de viaje, kilos disponibles, precio por kilo, notas y el WhatsApp
            de contacto que publicas para tus anuncios.
          </li>
        </ul>

        <h3>2. Para qué usamos tus datos</h3>
        <ul>
          <li>Crear y administrar tu cuenta, y permitirte iniciar sesión.</li>
          <li>Publicar y mostrar tus anuncios a otros usuarios.</li>
          <li>
            Compartir tu WhatsApp con usuarios interesados en contactarte por
            un anuncio (solo visible para usuarios con cuenta creada).
          </li>
          <li>Comunicarnos contigo sobre tu cuenta, por ejemplo para restablecer tu contraseña.</li>
        </ul>

        <h3>3. Con quién compartimos tus datos</h3>
        <p>
          No vendemos ni compartimos tus datos con terceros para fines
          publicitarios. Usamos <b>Supabase</b> como proveedor de base de
          datos y autenticación, y <b>Vercel</b> como proveedor de hosting;
          ambos procesan datos en nuestro nombre bajo sus propias políticas de
          seguridad. Tu WhatsApp de contacto solo se muestra a usuarios
          registrados que lo solicitan desde un anuncio.
        </p>

        <h3>4. Cookies y sesión</h3>
        <p>
          Usamos cookies estrictamente necesarias para mantener tu sesión
          iniciada. No usamos cookies de rastreo publicitario.
        </p>

        <h3>5. Tus derechos</h3>
        <p>
          Puedes acceder, corregir o eliminar tu información en cualquier
          momento desde la sección <b>&quot;Mi cuenta&quot;</b>, incluyendo la
          opción de borrar tu cuenta y tus datos asociados de forma
          permanente. Si tienes dudas sobre tus datos, contáctanos por los
          medios indicados en la plataforma.
        </p>

        <h3>6. Seguridad</h3>
        <p>
          Tomamos medidas razonables para proteger tu información, incluyendo
          cifrado de contraseñas y acceso restringido a la base de datos. Sin
          embargo, ningún sistema es 100% seguro y no podemos garantizar
          protección absoluta.
        </p>

        <h3>7. Menores de edad</h3>
        <p>
          SendGO no está dirigido a menores de 18 años y no recopilamos
          intencionalmente datos de menores.
        </p>

        <h3>8. Cambios a esta política</h3>
        <p>
          Podemos actualizar esta política a medida que la plataforma
          evolucione. Publicaremos cualquier cambio en esta misma página.
        </p>

        <h3>9. Contacto</h3>
        <p>
          Para preguntas sobre esta política o tus datos, contáctanos a
          través de los medios indicados en la plataforma.
        </p>
      </div>
    </>
  );
}

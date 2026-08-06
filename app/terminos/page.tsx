export default function TerminosPage() {
  return (
    <>
      <div className="section-head">
        <h2>Términos y condiciones</h2>
        <p>Borrador — última actualización: agosto de 2026.</p>
      </div>

      <div className="legal">
        <div className="warn">
          <strong>Nota:</strong> este es un borrador inicial redactado para el
          MVP de ENVIALO. Antes de operar públicamente, debe ser revisado por
          un abogado con experiencia en comercio, transporte y protección de
          datos en EE.UU. y Colombia.
        </div>

        <h3>1. Qué es ENVIALO</h3>
        <p>
          ENVIALO es un tablón de anuncios (crowdshipping) que conecta a
          viajeros con espacio disponible en su equipaje con personas que
          desean enviar artículos entre el área DMV (Washington DC, Maryland
          y Virginia) y ciudades de Colombia, en ambas direcciones.
        </p>

        <h3>2. ENVIALO es solo intermediario</h3>
        <ul>
          <li>ENVIALO no transporta, custodia ni verifica ninguna mercancía.</li>
          <li>ENVIALO no fija precios: cada viajero decide su propio precio por kilo.</li>
          <li>ENVIALO no procesa pagos ni participa en la transacción económica entre usuarios.</li>
          <li>
            Todo acuerdo — precio, forma de entrega, contenido del envío — se
            realiza directamente entre el viajero y el remitente, por fuera
            de la plataforma (por ejemplo, vía WhatsApp).
          </li>
        </ul>

        <h3>3. Responsabilidad del usuario</h3>
        <p>
          Cada viajero es responsable de cumplir las leyes aduaneras y de
          transporte de EE.UU. y Colombia, y de todo lo que decida llevar en
          su equipaje. Cada remitente es responsable de que el contenido de
          su envío sea lícito, esté correctamente declarado y cumpla dichas
          normas. ENVIALO no verifica el contenido de los envíos ni garantiza
          la idoneidad de ningún usuario.
        </p>

        <h3>4. Cuentas de usuario</h3>
        <p>
          Para publicar un anuncio o ver el contacto de un anunciante se
          requiere crear una cuenta. Al registrarte, tu país determina qué
          documento de identificación se solicita: cédula de ciudadanía para
          cuentas creadas desde Colombia, o número de teléfono verificable
          para cuentas creadas desde EE.UU. Esta información se usa
          únicamente para identificarte dentro de la plataforma y no se
          comparte con terceros salvo obligación legal.
        </p>

        <h3>5. Anuncios</h3>
        <p>
          Los anuncios publicados dejan de mostrarse automáticamente una vez
          pasa la fecha de viaje indicada por el usuario. ENVIALO puede
          remover anuncios que incumplan estos términos o la ley aplicable.
        </p>

        <h3>6. Limitación de responsabilidad</h3>
        <p>
          En la máxima medida permitida por la ley, ENVIALO no será
          responsable por pérdidas, daños, retrasos, decomisos, disputas de
          pago o cualquier perjuicio derivado de los acuerdos entre viajeros
          y remitentes, ni del contenido transportado.
        </p>

        <h3>7. Contacto</h3>
        <p>
          Para preguntas sobre estos términos, contáctanos a través de los
          medios indicados en la plataforma.
        </p>
      </div>
    </>
  );
}

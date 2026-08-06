import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="route-strip">
          <span>DMV</span>
          <span className="dot"></span>
          <span>TODA COLOMBIA</span>
          <span className="dot"></span>
          <span>DMV</span>
        </div>
        <h1>
          Tu encomienda viaja
          <br />
          con <em>alguien que ya va</em>.
        </h1>
        <p className="sub">
          ENVIALO conecta a viajeros con espacio en su maleta con personas que
          necesitan enviar algo entre Washington DC, Maryland, Virginia y
          cualquier ciudad de Colombia.
        </p>
        <div className="cta-row">
          <Link href="/publicar" className="btn btn-primary">
            Publicar anuncio
          </Link>
          <Link href="/anuncios" className="btn btn-outline">
            Ver anuncios
          </Link>
        </div>
      </div>

      <div className="how">
        <div className="how-card">
          <div className="tag">Paso 01</div>
          <h3>El viajero publica</h3>
          <p>Ruta, fecha, kilos disponibles y el precio por kilo que él mismo decide.</p>
        </div>
        <div className="how-card">
          <div className="tag">Paso 02</div>
          <h3>El remitente busca</h3>
          <p>
            Filtra por dirección y ciudad, encuentra un viajero que le sirva
            y crea una cuenta para contactarlo directo.
          </p>
        </div>
        <div className="how-card">
          <div className="tag">Paso 03</div>
          <h3>Ellos acuerdan todo</h3>
          <p>
            Precio, entrega, qué se envía y cómo. El trato es 100% entre
            viajero y remitente.
          </p>
        </div>
      </div>

      <Disclaimer />
    </>
  );
}

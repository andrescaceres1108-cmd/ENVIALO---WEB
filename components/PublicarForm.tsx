"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { publicarAnuncioAction, type ActionState } from "@/lib/actions";
import SegmentedControl from "@/components/SegmentedControl";
import { CIUDADES_COLOMBIA, DESTINOS_DMV } from "@/lib/ciudades-co";

const initialState: ActionState = { ok: false };

export default function PublicarForm() {
  const router = useRouter();
  const [direccion, setDireccion] = useState<"usa-co" | "co-usa">("usa-co");
  const [ciudadCo, setCiudadCo] = useState<string>(CIUDADES_COLOMBIA[0]);
  const [ciudadCoOtra, setCiudadCoOtra] = useState("");
  const [destinoDmv, setDestinoDmv] = useState<string>(DESTINOS_DMV[0]);
  const [state, formAction, pending] = useActionState(publicarAnuncioAction, initialState);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => router.push("/anuncios"), 900);
      return () => clearTimeout(t);
    }
  }, [state.ok, router]);

  const ciudadDestinoValue =
    direccion === "usa-co"
      ? ciudadCo === "Otra ciudad"
        ? ciudadCoOtra
        : ciudadCo
      : destinoDmv;

  return (
    <form action={formAction} className="card-form" noValidate>
      <input type="hidden" name="direccion" value={direccion} />
      <input type="hidden" name="ciudad_destino" value={ciudadDestinoValue} />

      <div className="field">
        <label>Dirección del viaje</label>
        <SegmentedControl
          value={direccion}
          onChange={setDireccion}
          options={[
            { value: "usa-co", label: "DMV → COLOMBIA" },
            { value: "co-usa", label: "COLOMBIA → DMV" },
          ]}
        />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="ciudad_origen">
            Ciudad de origen{" "}
            <span className="opt">
              — {direccion === "usa-co" ? "en el DMV" : "en Colombia"}
            </span>
          </label>
          <input
            id="ciudad_origen"
            name="ciudad_origen"
            placeholder={direccion === "usa-co" ? "Ej: Arlington, VA" : "Ej: Medellín"}
            required
          />
          {state.errors?.ciudad_origen && (
            <p className="field-error">{state.errors.ciudad_origen}</p>
          )}
        </div>

        <div className="field">
          <label>Ciudad de destino</label>
          {direccion === "usa-co" ? (
            <>
              <select value={ciudadCo} onChange={(e) => setCiudadCo(e.target.value)}>
                {CIUDADES_COLOMBIA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {ciudadCo === "Otra ciudad" && (
                <input
                  style={{ marginTop: 8 }}
                  placeholder="Nombre de la ciudad"
                  value={ciudadCoOtra}
                  onChange={(e) => setCiudadCoOtra(e.target.value)}
                  required
                />
              )}
            </>
          ) : (
            <select value={destinoDmv} onChange={(e) => setDestinoDmv(e.target.value)}>
              {DESTINOS_DMV.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {state.errors?.ciudad_destino && (
            <p className="field-error">{state.errors.ciudad_destino}</p>
          )}
        </div>
      </div>

      {direccion === "co-usa" && (
        <div className="field">
          <div className="checkbox-row">
            <input type="checkbox" id="entrega_domicilio" name="entrega_domicilio" />
            <label htmlFor="entrega_domicilio">
              Entrego a domicilio en cualquier ciudad del DMV, sin importar la que elegí arriba
            </label>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="fecha_viaje">Fecha del viaje</label>
          <input id="fecha_viaje" name="fecha_viaje" type="date" required />
          {state.errors?.fecha_viaje && (
            <p className="field-error">{state.errors.fecha_viaje}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="kilos_disponibles">Kilos disponibles</label>
          <input
            id="kilos_disponibles"
            name="kilos_disponibles"
            type="number"
            min="1"
            max="46"
            placeholder="Ej: 10"
            required
          />
          {state.errors?.kilos_disponibles && (
            <p className="field-error">{state.errors.kilos_disponibles}</p>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="precio_kilo_usd">
            Precio por kilo (USD) <span className="opt">— lo decides tú</span>
          </label>
          <input
            id="precio_kilo_usd"
            name="precio_kilo_usd"
            type="number"
            min="1"
            placeholder="Ej: 8"
            required
          />
          {state.errors?.precio_kilo_usd && (
            <p className="field-error">{state.errors.precio_kilo_usd}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="nombre_contacto">Tu nombre</label>
          <input id="nombre_contacto" name="nombre_contacto" placeholder="Ej: Andrés G." required />
          {state.errors?.nombre_contacto && (
            <p className="field-error">{state.errors.nombre_contacto}</p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="whatsapp">
          WhatsApp <span className="opt">— con código de país</span>
        </label>
        <input id="whatsapp" name="whatsapp" type="tel" placeholder="Ej: +1 703 555 0123" required />
        {state.errors?.whatsapp && <p className="field-error">{state.errors.whatsapp}</p>}
        <p className="field-hint">
          Solo lo verán usuarios con cuenta creada en SendGO.
        </p>
      </div>

      <div className="field">
        <label htmlFor="notas">
          Notas <span className="opt">— opcional</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          placeholder="Ej: No llevo líquidos ni electrónicos grandes. Entrego en terminal."
        ></textarea>
      </div>

      <div className="field">
        <div className="check">
          <input type="checkbox" id="acepto_terminos" name="acepto_terminos" required />
          <span>
            Entiendo que <b>SendGO solo publica mi anuncio</b> y no es
            responsable de la mercancía, los acuerdos, los pagos ni el
            cumplimiento de normas aduaneras. El trato es directamente entre
            el viajero y el remitente.
          </span>
        </div>
        {state.errors?.acepto_terminos && (
          <p className="field-error">{state.errors.acepto_terminos}</p>
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Publicando…" : "Publicar anuncio"}
      </button>
      {state.message && (
        <p className={`form-msg ${state.ok ? "ok" : "err"}`}>
          {state.ok ? "Anuncio publicado. Redirigiendo a los anuncios…" : state.message}
        </p>
      )}
    </form>
  );
}

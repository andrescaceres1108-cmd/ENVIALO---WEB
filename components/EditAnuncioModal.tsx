"use client";

import { useActionState, useEffect, useState } from "react";
import { editarAnuncioAction, type ActionState } from "@/lib/actions";
import SegmentedControl from "@/components/SegmentedControl";
import { CIUDADES_COLOMBIA, DESTINOS_DMV } from "@/lib/ciudades-co";
import type { AnuncioPublico } from "@/components/TagCard";

const initialState: ActionState = { ok: false };

export default function EditAnuncioModal({
  anuncio,
  whatsappInicial,
  onClose,
  onSaved,
}: {
  anuncio: AnuncioPublico;
  whatsappInicial: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [direccion, setDireccion] = useState<"usa-co" | "co-usa">(anuncio.direccion);

  const esCiudadCoConocida = CIUDADES_COLOMBIA.includes(
    anuncio.ciudad_destino as (typeof CIUDADES_COLOMBIA)[number]
  );
  const [ciudadCo, setCiudadCo] = useState<string>(
    anuncio.direccion === "usa-co"
      ? esCiudadCoConocida
        ? anuncio.ciudad_destino
        : "Otra ciudad"
      : CIUDADES_COLOMBIA[0]
  );
  const [ciudadCoOtra, setCiudadCoOtra] = useState(
    anuncio.direccion === "usa-co" && !esCiudadCoConocida ? anuncio.ciudad_destino : ""
  );
  const [destinoDmv, setDestinoDmv] = useState<string>(
    anuncio.direccion === "co-usa" ? anuncio.ciudad_destino : DESTINOS_DMV[0]
  );

  const editarConId = editarAnuncioAction.bind(null, anuncio.id);
  const [state, formAction, pending] = useActionState(editarConId, initialState);

  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => onSaved(), 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  const ciudadDestinoValue =
    direccion === "usa-co"
      ? ciudadCo === "Otra ciudad"
        ? ciudadCoOtra
        : ciudadCo
      : destinoDmv;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="section-head" style={{ padding: "0 0 8px" }}>
          <h2 style={{ fontSize: "1.3rem" }}>Editar anuncio</h2>
          <p>Actualiza los datos de tu viaje.</p>
        </div>

        <form action={formAction} className="card-form" noValidate>
          <input type="hidden" name="direccion" value={direccion} />
          <input type="hidden" name="ciudad_destino" value={ciudadDestinoValue} />
          <input type="hidden" name="acepto_terminos" value="on" />

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
              <label htmlFor="e_ciudad_origen">
                Ciudad de origen{" "}
                <span className="opt">
                  — {direccion === "usa-co" ? "en el DMV" : "en Colombia"}
                </span>
              </label>
              <input
                id="e_ciudad_origen"
                name="ciudad_origen"
                defaultValue={anuncio.ciudad_origen}
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
                <input
                  type="checkbox"
                  id="e_entrega_domicilio"
                  name="entrega_domicilio"
                  defaultChecked={anuncio.entrega_domicilio}
                />
                <label htmlFor="e_entrega_domicilio">
                  Entrego a domicilio en cualquier ciudad del DMV, sin importar la que elegí arriba
                </label>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="field">
              <label htmlFor="e_fecha_viaje">Fecha del viaje</label>
              <input
                id="e_fecha_viaje"
                name="fecha_viaje"
                type="date"
                defaultValue={anuncio.fecha_viaje}
                required
              />
              {state.errors?.fecha_viaje && (
                <p className="field-error">{state.errors.fecha_viaje}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="e_kilos_disponibles">Kilos disponibles</label>
              <input
                id="e_kilos_disponibles"
                name="kilos_disponibles"
                type="number"
                min="1"
                max="46"
                defaultValue={anuncio.kilos_disponibles}
                required
              />
              {state.errors?.kilos_disponibles && (
                <p className="field-error">{state.errors.kilos_disponibles}</p>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="e_precio_kilo_usd">
                Precio por kilo (USD) <span className="opt">— lo decides tú</span>
              </label>
              <input
                id="e_precio_kilo_usd"
                name="precio_kilo_usd"
                type="number"
                min="1"
                defaultValue={anuncio.precio_kilo_usd}
                required
              />
              {state.errors?.precio_kilo_usd && (
                <p className="field-error">{state.errors.precio_kilo_usd}</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="e_nombre_contacto">Tu nombre</label>
              <input
                id="e_nombre_contacto"
                name="nombre_contacto"
                defaultValue={anuncio.nombre_contacto}
                required
              />
              {state.errors?.nombre_contacto && (
                <p className="field-error">{state.errors.nombre_contacto}</p>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="e_whatsapp">
              WhatsApp <span className="opt">— con código de país</span>
            </label>
            <input
              id="e_whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={whatsappInicial}
              placeholder="Ej: +1 703 555 0123"
              required
            />
            {state.errors?.whatsapp && <p className="field-error">{state.errors.whatsapp}</p>}
          </div>

          <div className="field">
            <label htmlFor="e_notas">
              Notas <span className="opt">— opcional</span>
            </label>
            <textarea
              id="e_notas"
              name="notas"
              defaultValue={anuncio.notas ?? ""}
              placeholder="Ej: No llevo líquidos ni electrónicos grandes. Entrego en terminal."
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          {state.message && (
            <p className={`form-msg ${state.ok ? "ok" : "err"}`}>
              {state.ok ? "Anuncio actualizado. Cerrando…" : state.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

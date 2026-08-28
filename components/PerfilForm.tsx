"use client";

import { useState } from "react";
import { useActionState } from "react";
import { actualizarPerfilAction, type ActionState } from "@/lib/actions";
import SegmentedControl from "@/components/SegmentedControl";

const initialState: ActionState = { ok: false };

export type PerfilInicial = {
  nombre: string;
  pais: "usa" | "co";
  telefono: string;
  cedula: string | null;
  facebook: string | null;
  instagram: string | null;
  avatar_url: string | null;
};

export default function PerfilForm({
  perfil,
  email,
}: {
  perfil: PerfilInicial;
  email: string;
}) {
  const [pais, setPais] = useState<"usa" | "co">(perfil.pais);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(actualizarPerfilAction, initialState);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  const fotoActual = avatarPreview ?? perfil.avatar_url;

  return (
    <form action={formAction} noValidate className="card-form">
      <div className="field">
        <label>Foto de perfil</label>
        <div className="avatar-field">
          <div className={`avatar-preview${fotoActual ? "" : " avatar-preview-empty"}`}>
            {fotoActual && <img src={fotoActual} alt="" />}
          </div>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarChange}
          />
        </div>
        {state.errors?.avatar && <p className="field-error">{state.errors.avatar}</p>}
        <p className="field-hint">
          Solo súbela si quieres cambiar la actual. Se actualizará también en tus anuncios.
        </p>
      </div>

      <div className="field">
        <label htmlFor="nombre">Nombre completo</label>
        <input id="nombre" name="nombre" defaultValue={perfil.nombre} required />
        {state.errors?.nombre && <p className="field-error">{state.errors.nombre}</p>}
      </div>

      <div className="field">
        <label>Correo</label>
        <p className="kv-value">{email}</p>
        <p className="field-hint">El correo no se puede cambiar por ahora.</p>
      </div>

      <div className="field">
        <label>País</label>
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

      <div className="field">
        <label htmlFor="telefono">
          Teléfono / WhatsApp <span className="opt">— con código de país</span>
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          defaultValue={perfil.telefono}
          required
        />
        {state.errors?.telefono && <p className="field-error">{state.errors.telefono}</p>}
      </div>

      {pais === "co" && (
        <div className="field">
          <label htmlFor="cedula">Cédula de ciudadanía</label>
          <input id="cedula" name="cedula" defaultValue={perfil.cedula ?? ""} required />
          {state.errors?.cedula && <p className="field-error">{state.errors.cedula}</p>}
          <p className="field-hint">
            Solo se usa para identificarte en la plataforma. SendGO no la comparte con terceros.
          </p>
        </div>
      )}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="facebook">Facebook</label>
          <input
            id="facebook"
            name="facebook"
            defaultValue={perfil.facebook ?? ""}
            placeholder="Nombre de perfil o link"
            required
          />
          {state.errors?.facebook && <p className="field-error">{state.errors.facebook}</p>}
        </div>
        <div className="field">
          <label htmlFor="instagram">Instagram</label>
          <input
            id="instagram"
            name="instagram"
            defaultValue={perfil.instagram ?? ""}
            placeholder="@usuario"
            required
          />
          {state.errors?.instagram && <p className="field-error">{state.errors.instagram}</p>}
        </div>
      </div>
      <p className="field-hint">
        Tus redes sociales le dan más confianza a quien te contacta.
      </p>

      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
      {state.message && (
        <p className={`form-msg ${state.ok ? "ok" : "err"}`}>{state.message}</p>
      )}
    </form>
  );
}

import { describe, expect, it } from "vitest";
import {
  signupSchema,
  loginSchema,
  updatePasswordSchema,
  publicarSchema,
  reportSchema,
} from "@/lib/validation";

const baseSignup = {
  nombre: "Andrés G.",
  email: "andres@example.com",
  password: "password123",
  telefono: "+1 703 555 0123",
  facebook: "andres.gomez",
  instagram: "@andresg",
  avatar: new File(["contenido"], "avatar.jpg", { type: "image/jpeg" }),
  acepto_terminos: true as const,
};

describe("signupSchema", () => {
  it("acepta una cuenta válida desde USA sin cédula", () => {
    const res = signupSchema.safeParse({ ...baseSignup, pais: "usa" });
    expect(res.success).toBe(true);
  });

  it("rechaza una cuenta desde Colombia sin cédula", () => {
    const res = signupSchema.safeParse({ ...baseSignup, pais: "co" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.cedula?.[0]).toMatch(/cédula/i);
    }
  });

  it("acepta una cuenta desde Colombia con cédula", () => {
    const res = signupSchema.safeParse({ ...baseSignup, pais: "co", cedula: "1020304050" });
    expect(res.success).toBe(true);
  });

  it("rechaza si no se aceptan los términos", () => {
    const res = signupSchema.safeParse({ ...baseSignup, pais: "usa", acepto_terminos: false });
    expect(res.success).toBe(false);
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    const res = signupSchema.safeParse({ ...baseSignup, pais: "usa", password: "abc123" });
    expect(res.success).toBe(false);
  });

  it("rechaza si falta la foto de perfil", () => {
    const res = signupSchema.safeParse({
      ...baseSignup,
      pais: "usa",
      avatar: new File([], "vacio.jpg", { type: "image/jpeg" }),
    });
    expect(res.success).toBe(false);
  });

  it("rechaza formatos de foto no soportados", () => {
    const res = signupSchema.safeParse({
      ...baseSignup,
      pais: "usa",
      avatar: new File(["contenido"], "avatar.gif", { type: "image/gif" }),
    });
    expect(res.success).toBe(false);
  });

  it("rechaza si falta Facebook o Instagram", () => {
    const res = signupSchema.safeParse({ ...baseSignup, pais: "usa", facebook: "" });
    expect(res.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rechaza un correo inválido", () => {
    const res = loginSchema.safeParse({ email: "no-es-un-correo", password: "x" });
    expect(res.success).toBe(false);
  });

  it("acepta credenciales con formato correcto", () => {
    const res = loginSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(res.success).toBe(true);
  });
});

describe("updatePasswordSchema", () => {
  it("rechaza si las contraseñas no coinciden", () => {
    const res = updatePasswordSchema.safeParse({
      password: "password123",
      confirmar: "password124",
    });
    expect(res.success).toBe(false);
  });

  it("acepta si las contraseñas coinciden y cumplen el mínimo", () => {
    const res = updatePasswordSchema.safeParse({
      password: "password123",
      confirmar: "password123",
    });
    expect(res.success).toBe(true);
  });
});

const basePublicar = {
  ciudad_origen: "Washington DC",
  entrega_domicilio: false,
  fecha_viaje: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  kilos_disponibles: "10",
  precio_kilo_usd: "5",
  nombre_contacto: "Andrés",
  whatsapp: "+1 703 555 0123",
  acepto_terminos: true as const,
};

describe("publicarSchema", () => {
  it("exige que co-usa tenga un destino válido del DMV", () => {
    const res = publicarSchema.safeParse({
      ...basePublicar,
      direccion: "co-usa",
      ciudad_destino: "Miami",
    });
    expect(res.success).toBe(false);
  });

  it("acepta co-usa con un destino válido del DMV", () => {
    const res = publicarSchema.safeParse({
      ...basePublicar,
      direccion: "co-usa",
      ciudad_destino: "Maryland",
    });
    expect(res.success).toBe(true);
  });

  it("rechaza fechas de viaje en el pasado", () => {
    const res = publicarSchema.safeParse({
      ...basePublicar,
      direccion: "co-usa",
      ciudad_destino: "Maryland",
      fecha_viaje: "2000-01-01",
    });
    expect(res.success).toBe(false);
  });

  it("rechaza más de 46 kilos disponibles", () => {
    const res = publicarSchema.safeParse({
      ...basePublicar,
      direccion: "co-usa",
      ciudad_destino: "Maryland",
      kilos_disponibles: "50",
    });
    expect(res.success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("rechaza un motivo demasiado corto", () => {
    const res = reportSchema.safeParse({ motivo: "no" });
    expect(res.success).toBe(false);
  });

  it("acepta un motivo con contenido suficiente", () => {
    const res = reportSchema.safeParse({ motivo: "Este anuncio parece una estafa." });
    expect(res.success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { rutaInternaSegura } from "@/lib/safe-redirect";

describe("rutaInternaSegura", () => {
  it("deja pasar rutas internas normales", () => {
    expect(rutaInternaSegura("/cuenta/actualizar-password")).toBe(
      "/cuenta/actualizar-password"
    );
    expect(rutaInternaSegura("/anuncios")).toBe("/anuncios");
  });

  it("usa la raíz cuando no viene nada", () => {
    expect(rutaInternaSegura(null)).toBe("/");
    expect(rutaInternaSegura(undefined)).toBe("/");
    expect(rutaInternaSegura("")).toBe("/");
  });

  it("bloquea URLs protocolo-relativas (open redirect)", () => {
    expect(rutaInternaSegura("//evil.com")).toBe("/");
    expect(rutaInternaSegura("//evil.com/phishing")).toBe("/");
  });

  it("bloquea la variante con backslash que algunos navegadores normalizan", () => {
    expect(rutaInternaSegura("/\\evil.com")).toBe("/");
  });

  it("bloquea URLs absolutas con esquema", () => {
    expect(rutaInternaSegura("https://evil.com")).toBe("/");
    expect(rutaInternaSegura("http://evil.com")).toBe("/");
    expect(rutaInternaSegura("javascript:alert(1)")).toBe("/");
  });

  it("bloquea rutas que no empiezan con /", () => {
    expect(rutaInternaSegura("evil.com")).toBe("/");
    expect(rutaInternaSegura("../../etc/passwd")).toBe("/");
  });
});

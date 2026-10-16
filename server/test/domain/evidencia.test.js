import { describe, it, expect } from "vitest";
import { sanearNombre, pesoEnKb, MAX_BYTES_EVIDENCIA, TIPOS_EVIDENCIA } from "../../src/domain/index.js";

describe("evidencia: constantes", () => {
  it("el máximo es 4 MB y solo hay 3 tipos permitidos", () => {
    expect(MAX_BYTES_EVIDENCIA).toBe(4 * 1024 * 1024);
    expect(Object.keys(TIPOS_EVIDENCIA).sort()).toEqual(["application/pdf", "image/jpeg", "image/png"]);
  });
});

describe("sanearNombre", () => {
  it.each([
    ["foto.JPG", ".jpg", "foto.jpg"],
    ["Switch del LC-2.png", ".png", "Switch-del-LC-2.png"],
    ["informe técnico ñandú.pdf", ".pdf", "informe-tecnico-nandu.pdf"],
    ["../../etc/passwd", ".png", "passwd.png"],
    ["C:\\Users\\kevin\\secreto.exe", ".png", "secreto.png"],
    ["   ", ".jpg", "archivo.jpg"],
    ["....", ".png", "archivo.png"],
    ["a<b>c|d?.png", ".png", "a-b-c-d.png"],
  ])("%j (%s) -> %s", (original, ext, esperado) => {
    expect(sanearNombre(original, ext)).toBe(esperado);
  });

  it("usa la extensión del tipo real, no la declarada", () => {
    expect(sanearNombre("imagen.exe", ".png")).toBe("imagen.png");
  });

  it("limita a 80 caracteres conservando la extensión", () => {
    const r = sanearNombre("x".repeat(300) + ".png", ".png");
    expect(r.length).toBeLessThanOrEqual(80);
    expect(r.endsWith(".png")).toBe(true);
  });
});

describe("pesoEnKb", () => {
  it("redondea a 2 decimales y nunca baja de 0.01", () => {
    expect(pesoEnKb(1024)).toBe(1);
    expect(pesoEnKb(1500)).toBe(1.46);
    expect(pesoEnKb(1)).toBe(0.01);
  });
});

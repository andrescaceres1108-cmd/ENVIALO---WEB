// Ciudades principales de Colombia para el selector de destino (dirección
// DMV -> Colombia). Incluye "Otra ciudad" como escape hatch para cubrir
// cualquier municipio no listado.
export const CIUDADES_COLOMBIA = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
  "Cúcuta",
  "Ibagué",
  "Santa Marta",
  "Villavicencio",
  "Armenia",
  "Neiva",
  "Pasto",
  "Montería",
  "Valledupar",
  "Popayán",
  "Sincelejo",
  "Tunja",
  "Otra ciudad",
] as const;

// Las 3 opciones fijas de destino para la dirección Colombia -> DMV.
export const DESTINOS_DMV = ["Washington DC", "Maryland", "Virginia"] as const;

export type DestinoDmv = (typeof DESTINOS_DMV)[number];

import { z } from "zod";
import { CIUDADES_COLOMBIA, DESTINOS_DMV } from "@/lib/ciudades-co";

export const signupSchema = z
  .object({
    nombre: z.string().trim().min(2, "Ingresa tu nombre completo."),
    email: z.string().trim().email("Correo inválido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    pais: z.enum(["usa", "co"], { message: "Elige tu país." }),
    telefono: z
      .string()
      .trim()
      .min(7, "Ingresa un teléfono válido con código de país."),
    cedula: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.pais === "co" && (!data.cedula || data.cedula.trim().length < 5)) {
      ctx.addIssue({
        code: "custom",
        message: "La cédula es obligatoria para cuentas creadas desde Colombia.",
        path: ["cedula"],
      });
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmar: z.string().min(1, "Confirma tu nueva contraseña."),
  })
  .refine((data) => data.password === data.confirmar, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmar"],
  });

export const publicarSchema = z
  .object({
    direccion: z.enum(["usa-co", "co-usa"]),
    ciudad_origen: z.string().trim().min(2, "Ingresa la ciudad de origen."),
    ciudad_destino: z.string().trim().min(2, "Elige la ciudad de destino."),
    entrega_domicilio: z.boolean().default(false),
    fecha_viaje: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha de viaje inválida.")
      .refine((v) => new Date(v + "T12:00:00") >= new Date(new Date().toDateString()), {
        message: "La fecha del viaje debe ser hoy o en el futuro.",
      }),
    kilos_disponibles: z.coerce
      .number({ message: "Ingresa los kilos disponibles." })
      .positive("Debe ser mayor a 0.")
      .max(46, "Máximo 46 kg."),
    precio_kilo_usd: z.coerce
      .number({ message: "Ingresa el precio por kilo." })
      .positive("Debe ser mayor a 0."),
    nombre_contacto: z.string().trim().min(2, "Ingresa tu nombre."),
    whatsapp: z.string().trim().min(7, "Ingresa un WhatsApp válido con código de país."),
    notas: z.string().trim().max(500).optional(),
    acepto_terminos: z.literal(true, {
      message: "Debes aceptar los términos para publicar.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.direccion === "co-usa") {
      if (!DESTINOS_DMV.includes(data.ciudad_destino as (typeof DESTINOS_DMV)[number])) {
        ctx.addIssue({
          code: "custom",
          message: "Elige Washington DC, Maryland o Virginia como destino.",
          path: ["ciudad_destino"],
        });
      }
    } else {
      if (!CIUDADES_COLOMBIA.includes(data.ciudad_destino as (typeof CIUDADES_COLOMBIA)[number]) &&
          data.ciudad_destino.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Ingresa la ciudad de destino en Colombia.",
          path: ["ciudad_destino"],
        });
      }
    }
  });

export type PublicarInput = z.infer<typeof publicarSchema>;

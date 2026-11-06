import { Michi } from '../componentes/marca'

/**
 * Aviso de privacidad (Ley 29733, Ley de Protección de Datos Personales del Perú).
 * Página pública. TEXTO BASE: el estudio debe revisarlo y completarlo con su razón social,
 * RUC, domicilio y el registro del banco de datos ante la Autoridad Nacional de Protección de Datos Personales.
 */
export function Privacidad() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-[68ch] px-6 py-14 sm:py-20">
        <a href="/" className="mb-12 inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/25">
          <Michi pose="sentado" className="size-8" />
          <span className="text-[1.0625rem] font-bold tracking-tight">Expedita</span>
        </a>
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Aviso de privacidad</h1>
        <p className="mt-3 text-[0.9375rem] text-muted-foreground">Ley N.º 29733, Ley de Protección de Datos Personales, y su reglamento.</p>

        <div className="mt-12 grid gap-10 text-[1rem] leading-relaxed [&_h2]:mb-3 [&_h2]:text-[1.125rem] [&_h2]:font-semibold [&_p+p]:mt-3">
          <section>
            <h2>Quién trata los datos</h2>
            <p>
              El responsable del banco de datos es el estudio jurídico que usa Expedita para gestionar sus procesos judiciales. Expedita es la herramienta
              con la que el estudio registra expedientes, plazos, audiencias y acciones de impulso procesal.
            </p>
          </section>
          <section>
            <h2>Qué datos se tratan y para qué</h2>
            <p>
              Datos de identificación y de los procesos judiciales de los clientes y contrapartes (nombres, número de expediente, juzgado, montos y
              actuaciones), y los datos de acceso de los miembros del estudio (nombre y correo).
            </p>
            <p>Se usan solo para la defensa y el seguimiento de los procesos encargados al estudio. No se venden ni se usan con fines publicitarios.</p>
          </section>
          <section>
            <h2>Dónde se guardan</h2>
            <p>
              En una base de datos cifrada en tránsito, aislada por estudio: cada estudio solo puede ver sus propios registros. Se hace un respaldo cifrado
              cada noche. Las contraseñas del SINOE, del CEJ y del correo del estudio nunca se guardan en Expedita.
            </p>
          </section>
          <section>
            <h2>Asistente de inteligencia artificial</h2>
            <p>
              Cuando un abogado usa el asistente (analizar una notificación, sugerir un impulso o redactar un borrador), los datos del expediente
              necesarios para esa tarea se envían al proveedor del modelo de IA para procesarlos. Todo lo que propone el asistente es un borrador que revisa
              un abogado.
            </p>
          </section>
          <section>
            <h2>Tus derechos</h2>
            <p>
              Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición (ARCO) dirigiéndote al estudio jurídico que gestiona tu caso.
            </p>
          </section>
        </div>

        <p className="mt-16 border-t border-separator pt-6 text-sm text-muted-foreground">
          Texto base pendiente de revisión por el estudio: completar razón social, RUC, domicilio y el código de inscripción del banco de datos.
        </p>
      </main>
    </div>
  )
}

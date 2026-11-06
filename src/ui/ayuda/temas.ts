/**
 * Contenido de la ayuda. Un solo lugar para todos los textos: el botón «?» de cada página,
 * el centro de ayuda y la guía de primeros pasos leen de aquí.
 * Redacción: frases cortas, en el vocabulario del estudio, con el nombre exacto de cada botón.
 */

export type TemaId =
  | 'hoy'
  | 'notificaciones'
  | 'plazos'
  | 'expedientes'
  | 'registrar'
  | 'agenda'
  | 'calendario'
  | 'visitas'
  | 'escritos'
  | 'avance-cliente'
  | 'reportes'
  | 'panel'
  | 'atajos'
  | 'asistente'
  | 'equipo'
  | 'importar'
  | 'sinoe'
  | 'drive'
  | 'recordatorio'
  | 'cuenta'

export interface Enlace {
  texto: string
  a: string
}

export interface SeccionAyuda {
  titulo?: string
  texto?: string
  pasos?: string[]
  lista?: string[]
}

export interface Tema {
  id: TemaId
  titulo: string
  grupo: 'Día a día' | 'Expedientes y escritos' | 'Configuración'
  resumen: string
  secciones: SeccionAyuda[]
  enlaces?: Enlace[]
}

export const TEMAS: Tema[] = [
  {
    id: 'hoy',
    titulo: 'Hoy: qué toca hacer',
    grupo: 'Día a día',
    resumen: 'La primera pantalla junta todo lo que necesita atención, ordenado por urgencia.',
    secciones: [
      {
        titulo: 'Qué aparece',
        lista: [
          'Vencidos: plazos que ya pasaron y no se marcaron como atendidos. Empieza por aquí.',
          'Esta semana: plazos de notificaciones, próximas acciones y audiencias de los próximos días.',
          'Seguimiento: expedientes sin movimiento (30 días por defecto) y riesgo de abandono en procesos civiles.',
        ],
      },
      {
        titulo: 'Los colores',
        lista: ['Rojo: vencido.', 'Ocre: vence en 3 días hábiles o menos.', 'Gris: más adelante o solo informativo.'],
      },
      { texto: 'Cada fila lleva al expediente. Cuando registras la acción que atiende un plazo, desaparece sola de la lista.' },
    ],
    enlaces: [{ texto: 'Registrar una acción', a: '/registrar' }],
  },
  {
    id: 'notificaciones',
    titulo: 'Notificaciones y plazos',
    grupo: 'Día a día',
    resumen: 'Registra cada notificación para que Expedita calcule el vencimiento y te avise.',
    secciones: [
      {
        titulo: 'Registrar una notificación',
        pasos: [
          'Pulsa «Nueva notificación».',
          'Pega el texto del correo del SINOE: el número de expediente, el asunto y la fecha se completan solos.',
          'Elige el acto (por ejemplo, «Traslado de la demanda»). El plazo y la norma salen del catálogo de la vía.',
          'Revisa el vencimiento calculado y guarda.',
        ],
      },
      {
        titulo: 'Atenderla',
        texto:
          'Al registrar la acción que responde a la notificación (desde la propia notificación o desde «Registrar acción»), queda atendida. También puedes marcarla a mano y reabrirla si hace falta.',
      },
      { titulo: 'Automático', texto: 'Si conectas el Gmail del estudio (Ajustes → SINOE), los avisos nuevos entran solos a esta bandeja.' },
    ],
    enlaces: [
      { texto: 'Cómo se calculan los plazos', a: '/ayuda#plazos' },
      { texto: 'Conectar el SINOE', a: '/ajustes?pestana=sinoe' },
    ],
  },
  {
    id: 'plazos',
    titulo: 'Cómo se calculan los plazos',
    grupo: 'Día a día',
    resumen: 'Días hábiles judiciales, con el efecto de la casilla electrónica.',
    secciones: [
      {
        lista: [
          'Solo cuentan los días hábiles: no cuentan sábados, domingos, feriados nacionales ni los días inhábiles que configure el estudio.',
          'Casilla electrónica: la notificación surte efecto al segundo día hábil de recibida (art. 155-C de la LOPJ). El plazo corre desde el día hábil siguiente.',
          'Cada vencimiento muestra la norma y la fecha de efecto para que puedas comprobarlo.',
          'Los feriados nacionales se calculan solos para cada año, incluida la Semana Santa.',
        ],
      },
      {
        titulo: 'Días inhábiles del Poder Judicial',
        texto:
          'Los días no laborables que declare el Poder Judicial o la Corte (por ejemplo, el Día del Juez) se agregan en Ajustes → Plazos. Desde ese momento se excluyen de todos los cómputos.',
      },
      { texto: 'Siempre revisa el vencimiento: si la resolución fija un plazo distinto, puedes cambiar la fecha a mano.' },
    ],
    enlaces: [{ texto: 'Agregar días inhábiles', a: '/ajustes?pestana=plazos' }],
  },
  {
    id: 'expedientes',
    titulo: 'Expedientes',
    grupo: 'Expedientes y escritos',
    resumen: 'Todos los casos del estudio, agrupados en carpetas por materia.',
    secciones: [
      {
        titulo: 'Buscar',
        texto:
          'Escribe código (LA-05), número, cliente, parte, juzgado o especialista. Desde cualquier pantalla también puedes pulsar Ctrl + K.',
      },
      {
        titulo: 'La ficha de cada expediente',
        lista: [
          'Ruta de etapas: dónde está el proceso. Se actualiza al registrar una acción con cambio de etapa.',
          'Historial: acciones, notificaciones y audiencias en orden.',
          'Consulta en el CEJ: el número desglosado y el botón para copiarlo (el CEJ se consulta a mano por su captcha).',
          'Documentos: la carpeta del cliente en el Drive del estudio.',
          'Escrito: abre un modelo con los datos del expediente ya completados.',
          'Compartir avance: un enlace para el cliente.',
        ],
      },
      { titulo: 'Archivar', texto: 'Un expediente concluido se archiva (no se borra): deja de aparecer en Hoy y se puede reactivar.' },
    ],
    enlaces: [{ texto: 'Importar el cuadro de Excel', a: '/ajustes?pestana=importar' }],
  },
  {
    id: 'registrar',
    titulo: 'Registrar una acción',
    grupo: 'Día a día',
    resumen: 'Cada impulso que se hace en un expediente: escrito, visita, revisión del CEJ, llamada…',
    secciones: [
      {
        pasos: [
          'Elige el expediente y el tipo de acción.',
          'Escribe el detalle y, si hay, el número de cargo.',
          'Si queda algo por hacer, anota la próxima acción y su fecha límite: aparecerá en Hoy cuando se acerque.',
          'Si el proceso pasó a otra etapa, elígela: la ruta del expediente se actualiza.',
        ],
      },
      {
        texto:
          'Una acción nueva da por cumplidas las próximas acciones abiertas del mismo expediente. Si atiende una notificación, la cierra.',
      },
    ],
    enlaces: [{ texto: 'Registrar ahora', a: '/registrar' }],
  },
  {
    id: 'agenda',
    titulo: 'Agenda y audiencias',
    grupo: 'Día a día',
    resumen: 'Calendario del mes con plazos, audiencias, visitas y días inhábiles.',
    secciones: [
      {
        titulo: 'Programar una audiencia',
        pasos: [
          'Pulsa «Programar audiencia».',
          'Elige expediente, tipo, fecha, hora y modalidad. Si es virtual, pega el enlace en «Lugar».',
          'Después de la audiencia, cámbiale el estado a realizada, reprogramada o frustrada.',
        ],
      },
      { titulo: 'Llevarla a tu calendario', texto: '«Suscribirse» pone toda la agenda en Google Calendar, iPhone u Outlook y se actualiza sola.' },
    ],
    enlaces: [{ texto: 'Suscribirse al calendario', a: '/ayuda#calendario' }],
  },
  {
    id: 'calendario',
    titulo: 'La agenda en tu calendario',
    grupo: 'Día a día',
    resumen: 'Plazos, audiencias y próximas acciones en Google Calendar, iPhone u Outlook, sin conectar cuentas.',
    secciones: [
      {
        titulo: 'Google Calendar',
        pasos: [
          'En Expedita: Agenda → «Suscribirse» → «Copiar».',
          'En la computadora, abre calendar.google.com.',
          'A la izquierda, junto a «Otros calendarios», pulsa «+» y luego «Desde URL».',
          'Pega la dirección y pulsa «Añadir calendario». Aparecerá también en la app del celular.',
        ],
      },
      { titulo: 'iPhone', pasos: ['Ajustes → Calendario → Cuentas → Añadir cuenta → Otra.', '«Añadir calendario suscrito» y pega la dirección.'] },
      {
        titulo: 'Bueno saber',
        lista: [
          'Cada persona lo agrega una sola vez en su propio calendario.',
          'Google lo actualiza cada pocas horas: lo urgente, míralo en Expedita.',
          'La dirección es privada. Si se filtra, un administrador la cambia desde la misma ventana.',
        ],
      },
    ],
    enlaces: [{ texto: 'Ir a la Agenda', a: '/agenda?suscribir=1' }],
  },
  {
    id: 'visitas',
    titulo: 'Visitas a juzgados',
    grupo: 'Día a día',
    resumen: 'Organiza las visitas por sede y deja constancia de cada expediente revisado.',
    secciones: [
      {
        pasos: [
          'Filtra por distrito o por actuación pendiente y elige un juzgado.',
          'Programa la visita con fecha y responsable.',
          'Copia la hoja de ruta para enviarla por WhatsApp.',
          'Al volver, registra el resultado de cada expediente: se crea la acción «Visita al despacho» en su historial.',
        ],
      },
      { texto: 'Guarda la sede, dirección o piso de cada juzgado para que aparezca en la hoja de ruta.' },
    ],
  },
  {
    id: 'escritos',
    titulo: 'Escritos en Word',
    grupo: 'Expedientes y escritos',
    resumen: 'Modelos con los datos del expediente y descarga en Word con el membrete del estudio.',
    secciones: [
      {
        pasos: [
          'Elige un modelo de la biblioteca.',
          'Elige el expediente: número, juzgado, partes, especialista y fecha se completan solos.',
          'Lo que falte queda entre [CORCHETES] y se lista debajo como «Por completar».',
          'Pulsa «Descargar Word»: A4, Arial 12, interlineado 1.5, con membrete y número de página.',
        ],
      },
      {
        titulo: 'Formato dentro del texto',
        lista: ['>> al inicio de la línea: alinea a la derecha (cabecera del escrito).', '^^ al inicio: centra (firma).', '**texto**: negrita.'],
      },
      {
        titulo: 'Modelos propios y jurisprudencia',
        texto:
          'Guarda tus modelos con «Nuevo modelo» o «Guardar como modelo». Usa {{cliente}}, {{numero}}, {{juzgado}}… para que se completen solos; en mayúsculas ({{JUZGADO}}) salen en mayúsculas. En «Jurisprudencia» guarda casaciones y criterios: al elegir uno, se inserta donde está el cursor.',
      },
    ],
    enlaces: [{ texto: 'Poner el membrete', a: '/escritos?membrete=1' }],
  },
  {
    id: 'avance-cliente',
    titulo: 'Compartir el avance con el cliente',
    grupo: 'Expedientes y escritos',
    resumen: 'Un enlace privado para que el cliente vea cómo va su caso, sin cuenta ni contraseña.',
    secciones: [
      {
        pasos: [
          'En la ficha del expediente pulsa «Compartir avance».',
          'Elige cuánto dura el enlace y pulsa «Crear y copiar enlace».',
          'Envíalo por WhatsApp con el botón o pégalo donde quieras.',
        ],
      },
      {
        titulo: 'Qué ve el cliente',
        texto:
          'La etapa del proceso, las fechas y tipos de cada movimiento y sus próximas audiencias. Nunca ve notas, descripciones internas, responsables ni documentos.',
      },
      { texto: 'Puedes desactivar el enlace en cualquier momento: deja de funcionar al instante.' },
    ],
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    grupo: 'Expedientes y escritos',
    resumen: 'Cuánto se impulsó, por quién y para qué cliente, en el periodo que elijas.',
    secciones: [
      {
        lista: [
          'Elige periodo, abogado y cliente en la fila de filtros.',
          '«Atendidas a tiempo»: notificaciones atendidas el día del vencimiento o antes.',
          'Pasa el mouse sobre una barra para ver el detalle, o abre «Ver como tabla».',
          'Pulsa un cliente de la tabla para filtrar por él.',
          '«Exportar CSV» descarga cada acción del periodo para abrirla en Excel.',
        ],
      },
    ],
  },
  {
    id: 'panel',
    titulo: 'Panel del estudio',
    grupo: 'Expedientes y escritos',
    resumen: 'El estado de toda la cartera de un vistazo: cuánto se impulsa, qué está quieto y dónde se concentra el trabajo.',
    secciones: [
      {
        lista: [
          'Impulsados en 30 días: expedientes activos con al menos una acción en el último mes. Lo ideal es que suba.',
          'Días desde el último movimiento: cuántos expedientes llevan 0–15, 16–30, 31–60, 61–90 o más de 90 días sin impulso.',
          'Más tiempo sin impulso: los primeros que conviene revisar; cada uno abre su ficha.',
          'Por etapa y por materia: dónde está concentrada la cartera.',
          'Actividad del equipo: acciones de cada persona en los últimos 30 días.',
        ],
      },
      { texto: 'Cada indicador de arriba lleva a la pantalla donde se trabaja. Para periodos y filtros a medida, usa Reportes.' },
    ],
    enlaces: [{ texto: 'Ir a Reportes', a: '/reportes' }],
  },
  {
    id: 'atajos',
    titulo: 'Atajos de teclado',
    grupo: 'Día a día',
    resumen: 'Trabaja más rápido sin soltar el teclado.',
    secciones: [
      {
        lista: [
          'Ctrl + K o /: buscar expedientes, secciones y temas de ayuda.',
          'R: registrar acción · N: nueva notificación · E: nuevo expediente · A: programar audiencia.',
          'G y luego una letra: ir a una sección (G H Hoy, G N Notificaciones, G E Expedientes, G A Agenda, G P Panel…).',
          'T: cambiar entre tema claro y oscuro.',
          '?: ver la lista completa de atajos.',
        ],
      },
      { texto: 'Los atajos no se activan mientras escribes en un campo. El menú «Nuevo» de arriba muestra la tecla de cada opción.' },
    ],
  },
  {
    id: 'asistente',
    titulo: 'Asistente con IA',
    grupo: 'Expedientes y escritos',
    resumen: 'Sugerencias de impulso, borradores de escritos y lectura de notificaciones.',
    secciones: [
      {
        lista: [
          'Todo lo que genera es un borrador: revísalo antes de usarlo.',
          '«Redactar escrito» arma un borrador con los datos del expediente; «Llevar a Escritos» lo pasa a Word con membrete.',
          'Para funcionar necesita que el administrador active la clave de IA del estudio.',
        ],
      },
    ],
  },
  {
    id: 'equipo',
    titulo: 'Equipo y permisos',
    grupo: 'Configuración',
    resumen: 'Quién entra a Expedita y qué puede hacer cada uno.',
    secciones: [
      {
        titulo: 'Invitar',
        pasos: [
          'Ajustes → Equipo → escribe correo, nombre y rol → «Invitar».',
          'Avísale a la persona (Expedita no envía correos de invitación).',
          'Ella abre Expedita, escribe ese mismo correo, elige «Primera vez: crear mi contraseña» y luego «Crear cuenta y entrar»: queda dentro del estudio.',
        ],
      },
      {
        titulo: 'Roles',
        lista: [
          'Administrador: todo, incluidos ajustes, equipo, historial de cambios y eliminar registros.',
          'Abogado: registra y edita todo; solo elimina las acciones y modelos que creó. No elimina expedientes (se archivan).',
        ],
      },
      { texto: 'Cada cambio queda registrado con quién y cuándo (Ajustes → Actividad).' },
    ],
    enlaces: [{ texto: 'Ir a Equipo', a: '/ajustes?pestana=equipo' }],
  },
  {
    id: 'importar',
    titulo: 'Importar el cuadro de Excel',
    grupo: 'Configuración',
    resumen: 'Carga de una vez todos los expedientes del cuadro del estudio.',
    secciones: [
      {
        pasos: [
          'Ajustes → Importar → elige el archivo .xlsx.',
          'Hoja principal: la que tiene los códigos (por ejemplo, CASOS LABORALES).',
          'Si tienes una versión más reciente del cuadro, elígela como segunda hoja: sus datos prevalecen.',
          'Pulsa «Revisar antes de importar», mira el resumen y luego «Importar».',
        ],
      },
      {
        texto:
          'El archivo se lee en tu navegador. Las hojas con contraseñas o datos sensibles no se abren. Los expedientes que ya existen no se duplican.',
      },
    ],
    enlaces: [{ texto: 'Ir a Importar', a: '/ajustes?pestana=importar' }],
  },
  {
    id: 'sinoe',
    titulo: 'Avisos del SINOE automáticos',
    grupo: 'Configuración',
    resumen: 'Los avisos que llegan al Gmail del estudio entran solos a Notificaciones.',
    secciones: [
      {
        pasos: [
          'Ajustes → SINOE → «Copiar script».',
          'Con el Gmail que recibe los avisos, entra a script.google.com y crea un proyecto nuevo. Pega el script y guarda.',
          'Elige la función «configurar», pulsa «Ejecutar» y autoriza. Copia la CLAVE que aparece en el registro.',
          '«Implementar» → «Nueva implementación» → «Aplicación web». Ejecutar como: Yo. Acceso: cualquier usuario. Copia la URL que termina en /exec.',
          'Vuelve a Expedita, pega URL y clave y pulsa «Guardar y probar».',
        ],
      },
      {
        texto:
          'El script solo lee los avisos: no envía ni borra correos, y Expedita no guarda contraseñas del SINOE. Se revisa cada 10 minutos mientras alguien tenga Expedita abierta.',
      },
    ],
    enlaces: [{ texto: 'Ir a Ajustes → SINOE', a: '/ajustes?pestana=sinoe' }],
  },
  {
    id: 'drive',
    titulo: 'Documentos en Google Drive',
    grupo: 'Configuración',
    resumen: 'Cada expediente muestra la carpeta de su cliente en el Drive del estudio.',
    secciones: [
      {
        pasos: [
          'Ajustes → Drive → «Copiar script».',
          'Con la cuenta dueña del Drive, entra a script.google.com, crea un proyecto, pega el script y escribe el nombre de la carpeta principal en CARPETA_RAIZ.',
          'Ejecuta «configurar», autoriza y copia la CLAVE.',
          'Implementa como aplicación web (como en el SINOE) y copia la URL /exec.',
          'Pega URL y clave en Expedita y pulsa «Guardar y probar»: verás qué carpetas se emparejaron con cada cliente.',
        ],
      },
      { texto: 'Expedita solo lee nombres y enlaces de los archivos; los documentos siguen en el Drive. Si una carpeta no se empareja, elígela a mano en la ficha.' },
    ],
    enlaces: [{ texto: 'Ir a Ajustes → Drive', a: '/ajustes?pestana=drive' }],
  },
  {
    id: 'recordatorio',
    titulo: 'Recordatorio diario por correo',
    grupo: 'Configuración',
    resumen: 'De lunes a viernes a las 8:00, un correo al equipo con lo vencido y lo que vence.',
    secciones: [
      {
        pasos: [
          'Ajustes → Recordatorio → «Copiar script» (ya lleva los datos del estudio).',
          'Con el Gmail del estudio, crea un proyecto en script.google.com, pega y guarda.',
          'Ejecuta «activar» y autoriza: queda programado.',
          'Para probarlo al momento, ejecuta «enviarAhora».',
        ],
      },
      { texto: 'Si no hay nada pendiente, ese día no se envía. Para quitarlo, ejecuta «desactivar».' },
    ],
    enlaces: [{ texto: 'Ir a Ajustes → Recordatorio', a: '/ajustes?pestana=recordatorio' }],
  },
  {
    id: 'cuenta',
    titulo: 'Tu cuenta y contraseña',
    grupo: 'Configuración',
    resumen: 'Entra con correo y contraseña, sin esperar enlaces por correo.',
    secciones: [
      {
        pasos: ['Pulsa tu nombre abajo a la izquierda (o «Más» en el celular) → «Mi cuenta».', 'Escribe una contraseña de al menos 8 caracteres y guarda.'],
      },
      { texto: 'Si la olvidas, en la pantalla de acceso elige «¿Olvidaste tu contraseña?».' },
    ],
    enlaces: [{ texto: 'Ir a Mi cuenta', a: '/cuenta' }],
  },
]

export const TEMA_POR_ID = new Map(TEMAS.map((t) => [t.id, t]))

/**
 * Modelos incluidos en Expedita (no se borran; el estudio puede copiarlos a su biblioteca y adaptarlos).
 * Convenciones del texto: «>> » alinea a la derecha, «^^ » centra, **negrita**.
 */
export interface ModeloBase {
  id: string
  titulo: string
  contenido: string
}

const cabecera = (sumilla: string) => `>> Expediente: {{numero}}
>> Especialista: {{especialista}}
>> Cuaderno: Principal
>> Escrito N.°: [N.° DE ESCRITO]
>> **Sumilla: ${sumilla}**

**SEÑOR JUEZ DEL {{JUZGADO}}:**

{{cliente}}, en los seguidos contra {{demandado}} sobre {{materia}}, en el expediente de la referencia, ante usted respetuosamente digo:`

const CIERRE = `{{ciudad}}, {{fecha}}



^^ ______________________________
^^ {{abogado}}
^^ Abogado`

const POR_TANTO = (pedido: string) => `**POR TANTO:**

A usted, señor Juez, ${pedido}`

export const MODELOS_BASE: ModeloBase[] = [
  {
    id: 'base-impulso',
    titulo: 'Escrito de impulso (solicita se provea)',
    contenido: `${cabecera('Solicito se provea')}

Que, habiendo transcurrido en exceso el plazo previsto por ley sin que se haya emitido pronunciamiento sobre lo pendiente en el presente proceso, solicito a su despacho se sirva PROVEER lo que corresponda conforme a ley, en atención al principio de celeridad procesal recogido en el artículo I del Título Preliminar de la Ley N.° 29497, Nueva Ley Procesal del Trabajo.

${POR_TANTO('pido acceder a lo solicitado por ser de justicia.')}

${CIERRE}`,
  },
  {
    id: 'base-sentencia',
    titulo: 'Pedido de sentencia',
    contenido: `${cabecera('Solicito se expida sentencia')}

Que, habiéndose llevado a cabo la audiencia de juzgamiento y encontrándose vencido el plazo legal para la emisión del fallo, solicito a su despacho se sirva EXPEDIR SENTENCIA en el presente proceso, en atención a los principios de celeridad y economía procesal.

${POR_TANTO('pido acceder a lo solicitado por ser de justicia.')}

${CIERRE}`,
  },
  {
    id: 'base-audiencia',
    titulo: 'Solicita programación de audiencia',
    contenido: `${cabecera('Solicito se programe audiencia')}

Que, encontrándose el proceso en estado de fijar fecha para la realización de la audiencia correspondiente, solicito a su despacho se sirva PROGRAMAR la misma a la brevedad posible, a fin de continuar con el trámite del proceso conforme a su estado.

${POR_TANTO('pido acceder a lo solicitado por ser de justicia.')}

${CIERRE}`,
  },
  {
    id: 'base-apersonamiento',
    titulo: 'Apersonamiento y casilla electrónica',
    contenido: `${cabecera('Me apersono y señalo casilla electrónica')}

Que, me apersono a la presente causa, señalando como domicilio procesal la casilla electrónica N.° [N.° DE CASILLA] del Sistema de Notificaciones Electrónicas (SINOE) del Poder Judicial, donde solicito se me notifiquen las resoluciones que se expidan en el presente proceso.

${POR_TANTO('pido tenerme por apersonado y por señalada la casilla electrónica indicada.')}

${CIERRE}`,
  },
  {
    id: 'base-presente',
    titulo: 'Se tenga presente',
    contenido: `${cabecera('Téngase presente')}

Que, solicito a su despacho se sirva TENER PRESENTE lo siguiente al momento de resolver:

[EXPOSICIÓN]

${POR_TANTO('pido tener presente lo expuesto.')}

${CIERRE}`,
  },
]

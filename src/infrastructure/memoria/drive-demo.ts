import type { DrivePort } from '@/application/ports'
import type { ArchivoDrive, CarpetaDrive } from '@/domain/documentos/drive'

/** Drive ficticio para el modo demo (coincide con los clientes de la semilla). */
const archivo = (nombre: string, tipo: string, dias: number): ArchivoDrive => ({
  id: nombre,
  nombre,
  tipo,
  url: 'https://drive.google.com/',
  actualizado: new Date(Date.now() - dias * 86_400_000).toISOString(),
})
const PDF = 'application/pdf'
const DOC = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const IMG = 'image/jpeg'

const carpeta = (nombre: string, archivos: ArchivoDrive[], subcarpetas: CarpetaDrive[] = []): CarpetaDrive => ({
  id: nombre,
  nombre,
  url: 'https://drive.google.com/',
  actualizado: new Date().toISOString(),
  archivos,
  subcarpetas,
})

export const driveDemo: DrivePort = {
  async catalogo() {
    return {
      raiz: 'Clientes (demo)',
      generado: new Date().toISOString(),
      carpetas: [
        carpeta('PÉREZ MARÍA', [archivo('DNI María Pérez.jpg', IMG, 90), archivo('Contrato de trabajo.pdf', PDF, 80)], [
          carpeta('01234-2025 Beneficios sociales', [
            archivo('Demanda.pdf', PDF, 70),
            archivo('Res. 01 Admisión.pdf', PDF, 55),
            archivo('Res. 04 Traslado.pdf', PDF, 2),
            archivo('Escrito absuelve traslado.docx', DOC, 1),
          ]),
        ]),
        carpeta('Torres Juan', [archivo('Demanda asignación familiar.pdf', PDF, 300), archivo('Pedido de sentencia.docx', DOC, 10)]),
        carpeta('Inversiones Norte SAC', [archivo('Poder notarial.pdf', PDF, 400), archivo('Facturas impagas.pdf', PDF, 390)]),
        carpeta('Cliente sin expediente', [archivo('Consulta inicial.docx', DOC, 5)]),
      ],
    }
  },
}

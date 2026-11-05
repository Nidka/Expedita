import { diaSemana, sumarDias, type FechaISO } from '../shared/fecha'
import type { Feriado } from './feriados'

/** Calendario judicial: sábados, domingos, feriados y días inhábiles configurados no cuentan. */
export class CalendarioHabil {
  private readonly inhabiles: Map<FechaISO, string>

  constructor(feriados: readonly Feriado[], diasInhabilesExtra: readonly FechaISO[] = []) {
    this.inhabiles = new Map(feriados.map((f) => [f.fecha, f.nombre]))
    for (const d of diasInhabilesExtra) if (!this.inhabiles.has(d)) this.inhabiles.set(d, 'Día inhábil')
  }

  esHabil(fecha: FechaISO): boolean {
    const dow = diaSemana(fecha)
    return dow !== 0 && dow !== 6 && !this.inhabiles.has(fecha)
  }

  /** Nombre del feriado o día inhábil, si lo es. */
  motivoInhabil(fecha: FechaISO): string | undefined {
    return this.inhabiles.get(fecha)
  }

  /** Avanza `n` días hábiles contando desde el día siguiente a `desde`. */
  sumarHabiles(desde: FechaISO, n: number): FechaISO {
    let fecha = desde
    let contados = 0
    while (contados < n) {
      fecha = sumarDias(fecha, 1)
      if (this.esHabil(fecha)) contados++
    }
    return fecha
  }

  /** Días hábiles entre `desde` (excluido) y `hasta` (incluido). Negativo si `hasta` es anterior. */
  habilesEntre(desde: FechaISO, hasta: FechaISO): number {
    if (desde === hasta) return 0
    const signo = hasta > desde ? 1 : -1
    let fecha = desde
    let n = 0
    while (fecha !== hasta) {
      fecha = sumarDias(fecha, signo)
      if (this.esHabil(fecha)) n++
    }
    return n * signo
  }
}

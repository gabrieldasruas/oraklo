// Datas do calendário (semana começando na segunda, como na referência).

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
export const DIAS_LETRA = ["S", "T", "Q", "Q", "S", "S", "D"];

export const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** 0 = segunda … 6 = domingo */
export const diaDaSemana = (d: Date) => (d.getDay() + 6) % 7;
export const inicioDaSemana = (d: Date) => somarDias(inicioDoDia(d), -diaDaSemana(d));

/** 6 semanas a partir da segunda antes do dia 1 (grade de mês). */
export function gradeDoMes(ref: Date) {
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const inicio = inicioDaSemana(primeiro);
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

export const hhmm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const paraInputData = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const paraInputHora = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
/** "2026-10-21" + "14:30" (hora local) → Date */
export const deInputs = (data: string, hora: string) => {
  const [a, m, d] = data.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min);
};

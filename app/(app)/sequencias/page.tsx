import { redirect } from "next/navigation";

// "Sequências" virou "Portfólio": links antigos continuam funcionando.
export default function SequenciasPage() {
  redirect("/portfolio");
}

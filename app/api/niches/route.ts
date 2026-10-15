import { getNiches } from "@/lib/niches";

export async function GET() {
  try {
    return Response.json(await getNiches());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Não foi possível carregar os nichos" }, { status: 500 });
  }
}

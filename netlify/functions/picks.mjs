import { getStore } from "@netlify/blobs";

const TEAMS = ["chivas", "america", "toluca", "cruzazul", "atlas", "leon", "monterrey", "pachuca"];
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

async function readPicks(store) {
  const values = await Promise.all(TEAMS.map(id => store.get(`team/${id}`, { type: "json" })));
  const picks = {};
  TEAMS.forEach((id, i) => { if (values[i]) picks[id] = { name: values[i].name, at: values[i].at }; });
  return picks;
}

export default async (req) => {
  const store = getStore({ name: "liguilla-apertura-2026-v3", consistency: "strong" });

  if (req.method === "GET") return json({ picks: await readPicks(store) });

  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch {}
    const name = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 30);
    if (!name) return json({ error: "Escribe tu nombre." }, 400);
    const device = String(body.device || "").slice(0, 64);
    const key = `name/${encodeURIComponent(norm(name))}`;

    const existing = await store.get(key, { type: "json" });
    if (existing) {
      if (existing.device && existing.device === device) return json({ team: existing.team, already: true });
      return json({ error: "Ese nombre ya está registrado.", code: "name_taken" }, 409);
    }

    const picks = await readPicks(store);
    const free = TEAMS.filter(id => !picks[id]);
    for (let i = free.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [free[i], free[j]] = [free[j], free[i]];
    }
    for (const id of free) {
      const { modified } = await store.setJSON(`team/${id}`, { name, at: Date.now() }, { onlyIfNew: true });
      if (!modified) continue; // otra persona lo ganó un instante antes
      const claimed = await store.setJSON(key, { team: id, device }, { onlyIfNew: true });
      if (!claimed.modified) {
        // el mismo nombre giró dos veces al mismo tiempo: se devuelve el equipo y se respeta el primero
        await store.delete(`team/${id}`);
        const first = await store.get(key, { type: "json" });
        if (first && first.device === device) return json({ team: first.team, already: true });
        return json({ error: "Ese nombre ya está registrado.", code: "name_taken" }, 409);
      }
      return json({ team: id });
    }
    return json({ error: "Ya no quedan equipos disponibles." }, 409);
  }

  if (req.method === "DELETE") {
    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey || req.headers.get("x-admin-key") !== adminKey) return json({ error: "No autorizado" }, 401);
    const { blobs } = await store.list();
    await Promise.all(blobs.map(b => store.delete(b.key)));
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/picks" };

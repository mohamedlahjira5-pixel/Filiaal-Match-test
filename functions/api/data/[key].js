// ───────────────────────────────────────────────────────────────────────────
// Mini-backend voor Autoglass Clinic
//
//   GET  /api/data/<sleutel>  -> geeft de data terug (eerst uit KV, anders het
//                                originele bestand uit de repo als startwaarde)
//   POST /api/data/<sleutel>  -> slaat nieuwe data op in KV (instant)
//
// Toegestane sleutels: filialen_data, city_lookup, verlof
// ───────────────────────────────────────────────────────────────────────────

const TOEGESTAAN = {
  filialen_data: "filialen_data.json",
  city_lookup:   "city_lookup.json",
  verlof:        "verlof.json",
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

// ── Lezen ──────────────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  const { params, env, request } = context;
  const sleutel = params.key;
  const bestand = TOEGESTAAN[sleutel];
  if (!bestand) return fout("Onbekende sleutel", 400);

  // 1. Probeer de live data uit KV
  const opgeslagen = await env.DATA.get(sleutel);
  if (opgeslagen !== null) {
    return new Response(opgeslagen, { headers: JSON_HEADERS });
  }

  // 2. Nog niets opgeslagen -> val terug op het originele bestand uit de repo
  const origineel = await fetch(new URL("/" + bestand, request.url));
  if (origineel.ok) {
    const tekst = await origineel.text();
    return new Response(tekst, { headers: JSON_HEADERS });
  }

  return fout("Geen data gevonden", 404);
}

// ── Opslaan ────────────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { params, env, request } = context;
  const sleutel = params.key;
  if (!TOEGESTAAN[sleutel]) return fout("Onbekende sleutel", 400);

  let tekst;
  try {
    tekst = await request.text();
    JSON.parse(tekst); // controleer dat het geldige JSON is
  } catch (e) {
    return fout("Ongeldige JSON", 400);
  }

  await env.DATA.put(sleutel, tekst);
  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
}

function fout(boodschap, status) {
  return new Response(JSON.stringify({ error: boodschap }), {
    status,
    headers: JSON_HEADERS,
  });
}

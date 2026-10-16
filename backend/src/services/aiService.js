/**
 * Service IA Fish&Chill – hybride gratuit
 *
 * 1. Mode local (sans clé) : assistant contextuel + insights calculés
 * 2. Mode LLM (optionnel) : Groq free tier (Llama 3.1) si GROQ_API_KEY est défini
 *    → https://console.groq.com (gratuit, très rapide)
 */

const Vessel = require('../models/Vessel');
const Catch = require('../models/Catch');
const Net = require('../models/Net');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ── Insights métier calculés (toujours gratuits) ────────────────────────────

async function getFleetInsights() {
  const [vessels, nets, recentCatches] = await Promise.all([
    Vessel.find(),
    Net.find().populate('vessel', 'name'),
    Catch.find().sort({ catchDate: -1 }).limit(200).populate('vessel', 'name'),
  ]);

  // Filets à risque
  const criticalNets = nets
    .filter((n) => n.wearLevel >= 70)
    .sort((a, b) => b.wearLevel - a.wearLevel)
    .slice(0, 5)
    .map((n) => ({
      id: n._id,
      identifier: n.identifier,
      vessel: n.vessel?.name,
      wearLevel: n.wearLevel,
      status: n.status,
      risk: n.wearLevel >= 90 ? 'critical' : 'high',
      recommendation:
        n.wearLevel >= 90
          ? 'Remplacement urgent recommandé'
          : 'Inspection à planifier sous 7 jours',
    }));

  // Fuel bas
  const lowFuel = vessels
    .filter((v) => v.capacity?.fuel && v.currentFuel / v.capacity.fuel < 0.25)
    .map((v) => ({
      name: v.name,
      percent: Math.round((v.currentFuel / v.capacity.fuel) * 100),
      liters: v.currentFuel,
    }));

  // Tendance captures (7 derniers jours vs 7 précédents)
  const now = Date.now();
  const week1 = recentCatches.filter((c) => now - new Date(c.catchDate).getTime() < 7 * 86400000);
  const week2 = recentCatches.filter((c) => {
    const t = now - new Date(c.catchDate).getTime();
    return t >= 7 * 86400000 && t < 14 * 86400000;
  });
  const kg1 = week1.reduce((s, c) => s + c.quantityKg, 0);
  const kg2 = week2.reduce((s, c) => s + c.quantityKg, 0);
  const trendPct = kg2 > 0 ? Math.round(((kg1 - kg2) / kg2) * 100) : null;

  // Top espèces
  const bySpecies = {};
  recentCatches.forEach((c) => {
    bySpecies[c.species] = (bySpecies[c.species] || 0) + c.quantityKg;
  });
  const topSpecies = Object.entries(bySpecies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([species, kg]) => ({ species, kg }));

  // Navires offline trop longtemps
  const stale = vessels
    .filter((v) => !v.isOnline && v.lastSyncAt)
    .filter((v) => now - new Date(v.lastSyncAt).getTime() > 12 * 3600000)
    .map((v) => ({
      name: v.name,
      hoursOffline: Math.round((now - new Date(v.lastSyncAt).getTime()) / 3600000),
    }));

  return {
    criticalNets,
    lowFuel,
    catchTrend: {
      last7daysKg: kg1,
      previous7daysKg: kg2,
      changePercent: trendPct,
      direction: trendPct == null ? 'unknown' : trendPct >= 0 ? 'up' : 'down',
    },
    topSpecies,
    staleVessels: stale,
    summary: buildSummary({ criticalNets, lowFuel, trendPct, kg1, stale, topSpecies }),
  };
}

function buildSummary({ criticalNets, lowFuel, trendPct, kg1, stale, topSpecies }) {
  const parts = [];
  if (criticalNets.length) {
    parts.push(
      `${criticalNets.length} filet(s) à surveiller (usure ≥ 70 %), prioritaire : ${criticalNets[0].identifier} (${criticalNets[0].wearLevel}%).`
    );
  }
  if (lowFuel.length) {
    parts.push(
      `Carburant bas : ${lowFuel.map((v) => `${v.name} (${v.percent}%)`).join(', ')}.`
    );
  }
  if (trendPct != null) {
    parts.push(
      `Captures 7j : ${kg1.toLocaleString()} kg (${trendPct >= 0 ? '+' : ''}${trendPct}% vs semaine précédente).`
    );
  }
  if (stale.length) {
    parts.push(
      `${stale.length} navire(s) sans synchro depuis > 12h : ${stale.map((v) => v.name).join(', ')}.`
    );
  }
  if (topSpecies.length) {
    parts.push(`Top espèces : ${topSpecies.map((s) => `${s.species} (${s.kg} kg)`).join(', ')}.`);
  }
  return parts.length ? parts.join(' ') : 'Flotte nominale – aucun point critique détecté.';
}

// ── Assistant conversationnel ──────────────────────────────────────────────

const NAV_HINTS = {
  fr: {
    carte: 'Pour voir la flotte : menu « Carte & Flotte » ou /app. Cliquez sur un navire pour le détail.',
    captures: 'Les captures sont dans le menu « Captures ». Filtres par navire/espèce côté API.',
    filets: 'Menu « Filets & Alertes » : usure, alertes automatiques, bouton Acquitter.',
    stats: 'Menu « Statistiques » : répartition par espèce et par jour.',
    fuel: 'Le niveau de carburant est visible sur la carte (liste) et dans la fiche navire.',
    synchro: 'La synchro mer/terre passe par MQTT. Un point vert = navire en ligne.',
    roles: 'Rôles : admin (tout), à terre (ops), embarqué (saisie bord), client (lecture).',
    aide: 'Je peux vous guider dans l’app, résumer la flotte, signaler les filets à risque ou le fuel bas. Posez une question !',
  },
  en: {
    carte: 'Fleet map: menu “Map & Fleet” or /app. Click a vessel for details.',
    captures: 'Catches are under “Catches”. Filter by vessel/species via API.',
    filets: '“Nets & Alerts”: wear levels, auto alerts, Acknowledge button.',
    stats: '“Statistics”: breakdown by species and by day.',
    fuel: 'Fuel level is on the map list and on the vessel detail page.',
    synchro: 'Sea/shore sync uses MQTT. Green dot = vessel online.',
    roles: 'Roles: admin (full), shore (ops), onboard (log data), client (read-only).',
    aide: 'I can guide you in the app, summarise the fleet, flag risky nets or low fuel. Ask me!',
  },
};

function matchIntent(message, lang = 'fr') {
  const m = message.toLowerCase();
  const hints = NAV_HINTS[lang] || NAV_HINTS.fr;

  if (/aide|help|comment|how|navigu|où|where|menu/.test(m)) {
    if (/carte|map|flotte|fleet|navire|vessel/.test(m)) return hints.carte;
    if (/captur|catch/.test(m)) return hints.captures;
    if (/filet|net|usure|wear/.test(m)) return hints.filets;
    if (/stat|kpi|chiffre/.test(m)) return hints.stats;
    if (/fuel|carbur|gasoil|diesel/.test(m)) return hints.fuel;
    if (/synchro|mqtt|connect|online/.test(m)) return hints.synchro;
    if (/r[oô]le|role|acc[eè]s|permission/.test(m)) return hints.roles;
    return hints.aide;
  }
  return null;
}

async function chat(message, { lang = 'fr', userRole = 'terre' } = {}) {
  const intentReply = matchIntent(message, lang);

  // Toujours enrichir avec les insights live
  let insights;
  try {
    insights = await getFleetInsights();
  } catch {
    insights = null;
  }

  // Si LLM disponible → réponse enrichie
  if (GROQ_API_KEY) {
    try {
      const llmReply = await callGroq(message, { lang, userRole, insights });
      return { reply: llmReply, source: 'groq', insights };
    } catch (err) {
      console.warn('Groq fallback:', err.message);
    }
  }

  // Mode local intelligent
  if (intentReply) {
    const extra = insights ? `\n\n📊 ${insights.summary}` : '';
    return { reply: intentReply + extra, source: 'local', insights };
  }

  // Questions métier sans intent clair
  if (insights && /filet|usure|net|risk|risque|alerte/.test(message.toLowerCase())) {
    if (!insights.criticalNets.length) {
      return {
        reply:
          lang === 'en'
            ? 'No nets above 70% wear. All good.'
            : 'Aucun filet au-dessus de 70 % d’usure. Situation nominale.',
        source: 'local',
        insights,
      };
    }
    const list = insights.criticalNets
      .map((n) => `• ${n.identifier} (${n.vessel}) – ${n.wearLevel}% – ${n.recommendation}`)
      .join('\n');
    return {
      reply:
        (lang === 'en' ? 'Nets to watch:\n' : 'Filets à surveiller :\n') + list,
      source: 'local',
      insights,
    };
  }

  if (insights && /fuel|carbur|gasoil/.test(message.toLowerCase())) {
    if (!insights.lowFuel.length) {
      return {
        reply:
          lang === 'en'
            ? 'No vessel under 25% fuel.'
            : 'Aucun navire sous 25 % de carburant.',
        source: 'local',
        insights,
      };
    }
    const list = insights.lowFuel.map((v) => `• ${v.name} : ${v.percent}% (${v.liters} L)`).join('\n');
    return {
      reply: (lang === 'en' ? 'Low fuel:\n' : 'Carburant bas :\n') + list,
      source: 'local',
      insights,
    };
  }

  if (insights && /r[eé]sum[eé]|summary|situation|flotte|fleet|overview/.test(message.toLowerCase())) {
    return { reply: insights.summary, source: 'local', insights };
  }

  // Fallback
  return {
    reply:
      lang === 'en'
        ? 'I can help with navigation, net wear, fuel, catch trends or a fleet summary. Try: “résumé flotte”, “filets à risque”, “carburant bas”, “comment voir les captures ?”'
        : 'Je peux aider pour la navigation, l’usure des filets, le carburant, les tendances de captures ou un résumé flotte. Essayez : « résumé flotte », « filets à risque », « carburant bas », « comment voir les captures ? »',
    source: 'local',
    insights,
  };
}

async function callGroq(message, { lang, userRole, insights }) {
  const system = `Tu es l'assistant IA de Fish&Chill, plateforme de suivi de flotte de pêche CFTO (Concarneau).
Rôle utilisateur: ${userRole}. Langue de réponse: ${lang === 'en' ? 'anglais' : 'français'}.
Réponds de façon concise et utile (3-6 phrases max).
Données live de la flotte:
${insights ? JSON.stringify({
  summary: insights.summary,
  criticalNets: insights.criticalNets,
  lowFuel: insights.lowFuel,
  catchTrend: insights.catchTrend,
  topSpecies: insights.topSpecies,
  staleVessels: insights.staleVessels,
}, null, 0) : 'non disponibles'}
Tu aides à naviguer dans l'app (Carte, Captures, Filets, Stats) et à interpréter ces données.`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Pas de réponse.';
}

module.exports = { getFleetInsights, chat };

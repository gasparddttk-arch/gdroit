// ÉVALUATION DE TD, DROIT DES OBLIGATIONS (équipe 1) : 59 questions de cours, une chambre temporaire.
// Chaque question monte de niveau en trois temps : la reconnaître (que citer ?), compléter sa phrase clé,
// puis restituer sa réponse de mémoire. Une épreuve « Pièges » par séance reprend les confusions classiques.
import { h } from './ui.js';
import { son } from './sons.js';
import { etat, sauver } from './state.js';
import { melange } from './engine.js';
import { qcm, continuer, barrePied } from './games.js';
import { recouvrement } from './commentaire.js';
import * as OBLIG from './eval-oblig-data.js';
import * as GALOP from './galop-admin-data.js';

export const NIVEAUX_EVAL = ['À découvrir', 'Reconnue', 'Maîtrisée', 'Restituée'];
// En test, ?jour=AAAA-MM-JJ fixe la date du jour (pour vérifier l'ouverture et la fermeture des chambres temporaires).
const jourDeTest = () => { const q = new URLSearchParams(location.search); return q.has('test') && q.get('jour') ? new Date(`${q.get('jour')}T12:00:00+01:00`) : null; };
export const evalOuverte = (maintenant = jourDeTest() || new Date(), fin = OBLIG.EVAL_FIN, debut = '') => {
  const j = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const jour = `${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, '0')}-${String(j.getDate()).padStart(2, '0')}`;
  return jour >= debut && jour <= fin;
};
// Une chambre de questions de cours : la même mécanique pour l'évaluation d'obligations et le galop d'administratif.
const TROU = /\{\{(.+?)\}\}/g;
export const motsDuTrou = (x) => [...x.trou.matchAll(TROU)].map((m) => m[1]);
function creerEval({ cle, type, QUESTIONS, PIEGES, THEMES, aideRestituer }) {
  const suiviEval = (n) => ((etat[cle] ||= {})[n] ||= { niveau: 0, seances: 0, scores: {} });
  const question = (n) => QUESTIONS.find((x) => x.n === n);
  const tete = (x, etape) => h('div', { class: 'cmt-tete' }, h('p', { class: 'surtitre' }, etape), h('p', { class: 'cmt-ref' }, `Question ${x.n} · ${THEMES[x.th]}`));

  // Ce qu'il faut citer : la bonne référence parmi celles d'autres questions, du même thème si possible.
  async function reconnaitre(zone, ctx, x) {
    // Pas d'intrus qui cite le même article ou le même arrêt (« Art. 1116 » et « Art. 1116 : pas de réparation… »).
    const COMMUNS = new Set(['Art', 'Civ', 'Com', 'Ass', 'Ord', 'Loi', 'Rapport', 'Président', 'République', 'Absence', 'Autonomie', 'Prêt', 'Rupture', 'Absentes']);
    const refs = (t) => new Set([...(t.match(/art\. \d+(-\d+)?|\d{1,2} \w+\.? \d{4}/gi) || []).map((r) => r.toLowerCase()),
      ...(t.match(/\b[A-ZÉ][a-zé]+(?:-[A-Z][a-z]+)?\b/g) || []).filter((w) => !COMMUNS.has(w))]);
    const proche = (a, b) => a === b || a.includes(b) || b.includes(a) || [...refs(a)].some((r) => refs(b).has(r));
    const memes = melange(QUESTIONS.filter((y) => y.n !== x.n && !proche(y.cite, x.cite) && y.th === x.th));
    const autres = melange(QUESTIONS.filter((y) => y.n !== x.n && !proche(y.cite, x.cite) && y.th !== x.th));
    const intrus = [];
    for (const y of [...memes, ...autres]) if (intrus.length < 3 && !intrus.some((t) => proche(t, y.cite))) intrus.push(y.cite);
    const options = melange([{ t: x.cite, ok: true }, ...intrus.map((t) => ({ t, ok: false, w: `C’est le repère de la question ${QUESTIONS.find((y) => y.cite === t).n} : ${QUESTIONS.find((y) => y.cite === t).q.replace(/^./, (c) => c.toLowerCase()).replace(/([^?])$/, '$1.')}` }))]);
    const r = await qcm(zone, ctx, { surtitre: 'Reconnaître', question: x.q, sousQuestion: 'Quel repère retenir pour cette question ?', options, pourquoiBon: x.points.find((pt) => [...refs(x.cite)].some((r) => pt.toLowerCase().includes(String(r).toLowerCase()))) || x.points[0], classe: 'cmt-qcm' });
    return r.ok ? 1 : 0;
  }

  // La phrase clé à trous : les mots entre {{ }} à replacer, avec des intrus pris aux autres questions.
  function completer(zone, ctx, x, niveau) {
    return new Promise((fini) => {
      const justes = motsDuTrou(x);
      const intrus = melange(QUESTIONS.filter((y) => y.n !== x.n).flatMap(motsDuTrou).filter((m) => !justes.includes(m))).slice(0, niveau >= 1 ? 4 : 2);
      const pool = melange([...justes, ...intrus]);
      const remplis = Array(justes.length).fill(null);
      const blocs = x.trou.split(TROU); // texte, mot, texte, mot…
      let actif = 0;
      const para = h('p', { class: 'cmt-trous' });
      const reserve = h('div', { class: 'cmt-reserve' });
      const valider = continuer('Valider', () => conclure());
      function dessiner() {
        para.replaceChildren(...blocs.map((b, i) => {
          if (i % 2 === 0) return b;
          const k = (i - 1) / 2;
          return h('button', { class: `cmt-trou${k === actif ? ' actif' : ''}${remplis[k] ? ' plein' : ''}`, onClick: () => { son('tap'); if (remplis[k]) { pool.push(remplis[k]); remplis[k] = null; } actif = k; dessiner(); } }, remplis[k] || '…');
        }));
        reserve.replaceChildren(...pool.map((m) => h('button', { class: 'cmt-morceau', onClick: () => {
          son('tap'); pool.splice(pool.indexOf(m), 1);
          if (remplis[actif]) pool.push(remplis[actif]);
          remplis[actif] = m;
          const vide = remplis.findIndex((v) => !v); actif = vide < 0 ? actif : vide;
          dessiner();
        } }, m)));
        valider.disabled = remplis.some((v) => !v);
      }
      function conclure() {
        const score = remplis.filter((m, k) => m === justes[k]).length / justes.length;
        ctx.combo(score === 1);
        [...para.querySelectorAll('.cmt-trou')].forEach((el, k) => { el.disabled = true; el.classList.add(remplis[k] === justes[k] ? 'juste' : 'faux'); if (remplis[k] !== justes[k]) el.textContent = justes[k]; });
        reserve.remove();
        valider.replaceWith(continuer('Continuer', () => fini(score)));
      }
      zone.replaceChildren(h('div', { class: 'ecran cmt' }, h('div', { class: 'ecran-corps' }, tete(x, 'Compléter'), h('h2', { class: 'question' }, x.q), para, reserve), barrePied(valider)));
      dessiner();
      window.scrollTo(0, 0);
    });
  }

  // Restituer : écrire sa réponse de mémoire, puis la comparer, point par point, à la réponse attendue.
  function restituer(zone, ctx, x, niveau) {
    return new Promise((fini) => {
      const champ = h('textarea', { class: 'cmt-ecrit', rows: 7, 'aria-label': 'Ta réponse', autocapitalize: 'sentences', spellcheck: 'false' });
      const valider = continuer('Comparer à la réponse', () => conclure());
      const corps = h('div', { class: 'cmt-champs' }, h('label', { class: 'cmt-champ' }, h('b', {}, 'Ta réponse'), champ));
      function conclure() {
        const texte = champ.value;
        const res = x.points.map((p) => ({ p, ...recouvrement(texte, p) }));
        const trouves = res.filter((r) => r.score >= 0.45).length;
        const score = trouves / res.length;
        ctx.combo(score >= 0.75);
        corps.replaceChildren(
          h('div', { class: `cmt-bilan ${score >= 0.75 ? 'juste' : score >= 0.4 ? 'moyen' : 'faux'}` }, h('b', {}, 'Points retrouvés'), h('span', { class: 'cmt-pct' }, `${trouves} sur ${res.length}`),
            h('p', { class: 'cmt-tien' }, texte.trim() || 'Rien écrit.')),
          h('ul', { class: 'eval-points' }, res.map((r) => h('li', { class: r.score >= 0.45 ? 'juste' : 'faux' }, r.p))));
        valider.replaceWith(continuer('Continuer', () => fini(score)));
        window.scrollTo(0, 0);
      }
      zone.replaceChildren(h('div', { class: 'ecran cmt' }, h('div', { class: 'ecran-corps' }, tete(x, 'Restituer'),
        h('h2', { class: 'question' }, x.q),
        h('p', { class: 'aide' }, niveau >= 2 ? aideRestituer : `Écris les ${x.points.length} points de la réponse, avec les articles et les arrêts.`), corps), barrePied(valider)));
      window.scrollTo(0, 0);
    });
  }

  // Pièges : quatre affirmations, vrai ou faux.
  async function pieges(zone, ctx, ns) {
    let bons = 0;
    for (const [k, i] of ns.entries()) {
      const p = PIEGES[i];
      const r = await qcm(zone, ctx, { surtitre: `Pièges · ${k + 1} sur ${ns.length}`, question: p.t, sousQuestion: 'Vrai ou faux ?',
        options: [{ t: 'Vrai', ok: p.v }, { t: 'Faux', ok: !p.v }], pourquoiBon: p.p, classe: 'cmt-qcm eval-piege' });
      if (r.ok) bons++;
    }
    return bons / ns.length;
  }

  // Une épreuve. round : { type, n, etape, dernier } ou { type, etape: 'pieges', ns }.
  async function jouerEval(zone, ctx, round) {
    let score;
    if (round.etape === 'pieges') {
      score = await pieges(zone, ctx, round.ns);
      ctx.gain(Math.round(score * 20));
    } else {
      const x = question(round.n);
      const suivi = suiviEval(x.n);
      if (round.etape === 'reconnaitre') score = await reconnaitre(zone, ctx, x);
      else if (round.etape === 'completer') score = await completer(zone, ctx, x, suivi.niveau);
      else score = await restituer(zone, ctx, x, suivi.niveau);
      ctx.gain(Math.round(score * (round.etape === 'restituer' ? 30 : 15)));
      suivi.scores[round.etape] = Math.round(score * 100) / 100;
      if (round.dernier) {
        // La question monte d'un niveau si ses épreuves de la séance sont solides, redescend si elles ont été difficiles.
        const vals = round.etapes.map((e) => suivi.scores[e] ?? 0);
        const moyenne = vals.reduce((s, v) => s + v, 0) / vals.length;
        suivi.seances++; suivi.vu = Date.now(); suivi.derniere = Math.round(moyenne * 100);
        suivi.niveau = Math.max(0, Math.min(3, suivi.niveau + (moyenne >= 0.8 ? 1 : moyenne < 0.5 ? -1 : 0)));
      }
    }
    sauver();
    ctx.fin({ score, parfait: score === 1 });
  }

  const ETAPES_PAR_NIVEAU = [['reconnaitre', 'completer'], ['completer', 'restituer'], ['restituer'], ['restituer']];
  const etapesDe = (n) => ETAPES_PAR_NIVEAU[suiviEval(n).niveau];
  // Les questions à travailler d'abord : le niveau le plus bas, puis la moins récemment vue.
  const prioritaires = () => [...QUESTIONS].sort((a, b) => {
    const x = suiviEval(a.n); const y = suiviEval(b.n);
    return x.niveau - y.niveau || (x.vu || 0) - (y.vu || 0) || a.n - b.n;
  });
  const roundsDe = (n) => { const etapes = etapesDe(n); return etapes.map((etape, i) => ({ type, n, etape, etapes, dernier: i === etapes.length - 1 })); };
  const piegesPour = (ns) => {
    const lies = melange(PIEGES.map((p, i) => ({ p, i })).filter(({ p }) => ns.includes(p.n))).map(({ i }) => i);
    const autres = melange(PIEGES.map((_, i) => i).filter((i) => !lies.includes(i)));
    return [...lies, ...autres].slice(0, 4);
  };
  // Une séance : quatre questions (les plus faibles), et les pièges au milieu.
  function roundsEval(choix = null) {
    const ns = choix ? [choix] : prioritaires().slice(0, 4).map((x) => x.n);
    const rounds = ns.flatMap(roundsDe);
    const milieu = choix ? rounds.length : rounds.findIndex((r) => r.n === ns[2]);
    rounds.splice(milieu < 0 ? rounds.length : milieu, 0, { type, etape: 'pieges', ns: piegesPour(ns) });
    return rounds;
  }
  function progressionEval() {
    const niveaux = QUESTIONS.map((x) => suiviEval(x.n).niveau);
    return { acquis: niveaux.filter((n) => n >= 2).length, total: niveaux.length, parfaite: niveaux.every((n) => n >= 3) };
  }
  return { jouer: jouerEval, rounds: roundsEval, suivi: suiviEval, progression: progressionEval, QUESTIONS, THEMES };
}

const EVAL = creerEval({ cle: 'evalOblig', type: 'evaltd', ...OBLIG, aideRestituer: 'Écris ta réponse comme à l’évaluation : notion, textes, arrêts, ce qu’a changé la réforme.' });
export const { jouer: jouerEval, rounds: roundsEval, suivi: suiviEval, progression: progressionEval, QUESTIONS, THEMES } = EVAL;
export const GALOP_ADMIN = creerEval({ cle: 'galopAdmin', type: 'galop', ...GALOP, aideRestituer: 'Écris ta réponse comme au galop : la notion, les textes, les arrêts avec leur date et ce qu’ils ont changé.' });
export const { GALOP_DEBUT, GALOP_FIN } = GALOP;

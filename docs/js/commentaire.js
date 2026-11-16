// LE COMMENTAIRE D'ARRÊT : une séance par arrêt, pour pouvoir restituer son commentaire presque mot pour mot.
// Six épreuves, de la reconnaissance à la restitution : l'affaire, le problème de droit, la solution, la problématique,
// le plan, puis tout réécrire de mémoire. Plus le niveau de l'arrêt monte, moins on aide.
import { h } from './ui.js';
import { son } from './sons.js';
import { etat, sauver } from './state.js';
import { melange } from './engine.js';
import { qcm, continuer, barrePied, repere } from './games.js';
import { COMMENTAIRES } from './commentaires-data.js';

export const ETAPES = ['affaire', 'probleme', 'solution', 'problematique', 'plan', 'restitution'];
const NOMS_ETAPES = { affaire: 'L’affaire', probleme: 'Le problème de droit', solution: 'La solution', problematique: 'La problématique', plan: 'Le plan', restitution: 'Le commentaire, de mémoire' };
const NUMEROS = ['I', 'A', 'B', 'II', 'A', 'B'];

const arretDe = (id) => COMMENTAIRES.find((c) => c.id === id);
const autres = (id) => melange(COMMENTAIRES.filter((c) => c.id !== id));
export const suiviCommentaire = (id) => ((etat.commentaires ||= {})[id] ||= { niveau: 0, seances: 0, scores: {} });
const enTete = (c, etape) => h('div', { class: 'cmt-tete' }, h('p', { class: 'surtitre' }, NOMS_ETAPES[etape]), h('p', { class: 'cmt-ref' }, `${c.ref}, ${c.nom}`));

// Une phrase en morceaux de trois ou quatre mots, sans couper « d’un » de son nom.
function morceaux(phrase) {
  const mots = phrase.split(/\s+/);
  const n = Math.max(4, Math.min(7, Math.round(mots.length / 3.5)));
  const taille = Math.ceil(mots.length / n);
  const out = [];
  for (let i = 0; i < mots.length; i += taille) out.push(mots.slice(i, i + taille).join(' '));
  return out;
}

// Remettre une phrase dans l'ordre : on touche les morceaux dans le bon ordre, on peut en retirer.
function ordonner(zone, ctx, { c, etape, question, phrase }) {
  return new Promise((fini) => {
    const justes = morceaux(phrase);
    let pool = melange(justes.map((t, i) => ({ t, i })));
    if (pool.every((x, k) => x.i === k)) pool = [...pool.slice(1), pool[0]];
    const pose = [];
    const ligne = h('div', { class: 'cmt-ligne', 'aria-live': 'polite' });
    const reserve = h('div', { class: 'cmt-reserve' });
    const valider = continuer('Valider', () => conclure());
    valider.disabled = true;
    function dessiner() {
      ligne.replaceChildren(...(pose.length ? pose.map((x) => h('button', { class: 'cmt-morceau pose', onClick: () => { son('tap'); pose.splice(pose.indexOf(x), 1); pool.push(x); dessiner(); } }, x.t)) : [h('span', { class: 'cmt-vide' }, 'Touche les morceaux dans l’ordre.')]));
      reserve.replaceChildren(...pool.map((x) => h('button', { class: 'cmt-morceau', 'data-i': repere(x.i), onClick: () => { son('tap'); pool.splice(pool.indexOf(x), 1); pose.push(x); dessiner(); } }, x.t)));
      valider.disabled = pool.length > 0;
    }
    function conclure() {
      const bons = pose.filter((x, k) => x.i === k).length;
      const score = bons / justes.length;
      ctx.combo(score === 1);
      [...ligne.children].forEach((el, k) => el.classList.add(pose[k].i === k ? 'juste' : 'faux'));
      ligne.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      reserve.replaceWith(h('div', { class: `cmt-corrige ${score === 1 ? 'juste' : ''}` }, h('b', {}, score === 1 ? 'Exact.' : 'La phrase exacte :'), h('p', {}, phrase)));
      valider.replaceWith(continuer('Continuer', () => fini(score)));
    }
    zone.replaceChildren(h('div', { class: 'ecran cmt' }, h('div', { class: 'ecran-corps' }, enTete(c, etape), h('h2', { class: 'question' }, question), ligne, reserve), barrePied(valider)));
    dessiner();
    window.scrollTo(0, 0);
  });
}

// La solution à trous : on replace les mots clés, avec quelques intrus pris dans les autres arrêts.
function trous(zone, ctx, { c, niveau }) {
  return new Promise((fini) => {
    let texte = c.solution;
    const cles = c.cles.filter((k) => texte.includes(k));
    const intrus = melange(autres(c.id).flatMap((x) => x.cles).filter((k) => !cles.includes(k))).slice(0, niveau >= 2 ? 4 : 2);
    const pool = melange([...cles, ...intrus]);
    const remplis = Array(cles.length).fill(null);
    const blocs = [];
    // On découpe le texte autour des mots clés, dans leur ordre d'apparition.
    const ordre = [...cles].sort((a, b) => texte.indexOf(a) - texte.indexOf(b));
    let reste = texte;
    ordre.forEach((k) => { const i = reste.indexOf(k); blocs.push(reste.slice(0, i)); blocs.push({ k }); reste = reste.slice(i + k.length); });
    blocs.push(reste);
    let actif = 0;
    const para = h('p', { class: 'cmt-trous' });
    const reserve = h('div', { class: 'cmt-reserve' });
    const valider = continuer('Valider', () => conclure());
    function dessiner() {
      let n = 0;
      para.replaceChildren(...blocs.map((b) => {
        if (typeof b === 'string') return b;
        const k = n++;
        return h('button', { class: `cmt-trou${k === actif ? ' actif' : ''}${remplis[k] ? ' plein' : ''}`, onClick: () => { son('tap'); if (remplis[k]) { pool.push(remplis[k]); remplis[k] = null; } actif = k; dessiner(); } }, remplis[k] || '…');
      }));
      reserve.replaceChildren(...pool.map((m) => h('button', { class: 'cmt-morceau', onClick: () => {
        son('tap'); pool.splice(pool.indexOf(m), 1);
        if (remplis[actif]) pool.push(remplis[actif]);
        remplis[actif] = m;
        const vide = remplis.findIndex((x) => !x); actif = vide < 0 ? actif : vide;
        dessiner();
      } }, m)));
      valider.disabled = remplis.some((x) => !x);
    }
    function conclure() {
      const bons = remplis.filter((m, k) => m === ordre[k]).length;
      const score = bons / ordre.length;
      ctx.combo(score === 1);
      [...para.querySelectorAll('.cmt-trou')].forEach((el, k) => { el.disabled = true; el.classList.add(remplis[k] === ordre[k] ? 'juste' : 'faux'); if (remplis[k] !== ordre[k]) el.textContent = ordre[k]; });
      reserve.remove();
      valider.replaceWith(continuer('Continuer', () => fini(score)));
    }
    zone.replaceChildren(h('div', { class: 'ecran cmt' }, h('div', { class: 'ecran-corps' }, enTete(c, 'solution'), h('h2', { class: 'question' }, 'Complète la solution.'), para, reserve), barrePied(valider)));
    dessiner();
    window.scrollTo(0, 0);
  });
}

// Le plan : six cases (I, A, B, II, A, B) à remplir avec les bons intitulés, parmi des intrus d'autres commentaires.
function plan(zone, ctx, { c, niveau }) {
  return new Promise((fini) => {
    const justes = [c.plan[0][0], c.plan[0][1], c.plan[0][2], c.plan[1][0], c.plan[1][1], c.plan[1][2]];
    const intrus = melange(autres(c.id).flatMap((x) => [x.plan[0][0], x.plan[1][1], x.plan[0][2]])).slice(0, niveau >= 2 ? 4 : 2);
    const pool = melange([...justes, ...intrus]);
    const cases = Array(6).fill(null);
    let actif = 0;
    const grille = h('ol', { class: 'cmt-plan' });
    const reserve = h('div', { class: 'cmt-reserve colonne' });
    const valider = continuer('Valider le plan', () => conclure());
    function dessiner() {
      grille.replaceChildren(...cases.map((t, k) => h('li', { class: `${k % 3 === 0 ? 'partie' : 'sous'}${k === actif ? ' actif' : ''}` },
        h('span', { class: 'cmt-num' }, NUMEROS[k]),
        h('button', { class: `cmt-case${t ? ' pleine' : ''}`, 'data-case': repere(k), onClick: () => { son('tap'); if (cases[k]) { pool.push(cases[k]); cases[k] = null; } actif = k; dessiner(); } }, t || (k % 3 === 0 ? 'Titre de la partie' : 'Sous-partie')))));
      reserve.replaceChildren(...pool.map((t) => h('button', { class: 'cmt-morceau long', 'data-ok': repere(justes.includes(t)), onClick: () => {
        son('tap'); pool.splice(pool.indexOf(t), 1);
        if (cases[actif]) pool.push(cases[actif]);
        cases[actif] = t;
        const vide = cases.findIndex((x) => !x); actif = vide < 0 ? actif : vide;
        dessiner();
      } }, t)));
      valider.disabled = cases.some((x) => !x);
    }
    function conclure() {
      const bons = cases.filter((t, k) => t === justes[k]).length;
      const score = bons / 6;
      ctx.combo(score === 1);
      [...grille.children].forEach((li, k) => {
        const b = li.querySelector('.cmt-case'); b.disabled = true;
        li.classList.remove('actif');
        li.classList.add(cases[k] === justes[k] ? 'juste' : 'faux');
        if (cases[k] !== justes[k]) li.append(h('small', { class: 'cmt-attendu' }, justes[k]));
      });
      reserve.remove();
      valider.replaceWith(continuer('Continuer', () => fini(score)));
    }
    zone.replaceChildren(h('div', { class: 'ecran cmt' }, h('div', { class: 'ecran-corps' }, enTete(c, 'plan'), h('h2', { class: 'question' }, 'Reconstitue le plan.'), h('p', { class: 'aide' }, c.problematique), grille, reserve), barrePied(valider)));
    dessiner();
    window.scrollTo(0, 0);
  });
}

// Les mots qui portent le sens : on compare la réponse écrite au modèle sur ces mots-là.
const VIDES = new Set('dans pour avec sans sous entre leur leurs elle elles plus moins mais donc comme cette ceux celle celles dont tout tous toute toutes être avoir sont peut encore lorsque alors ainsi aussi même très'.split(' '));
const normaliser = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
const motsDe = (s) => [...new Set(normaliser(s).split(/[^a-z0-9-]+/).filter((m) => m.length >= 4 && !VIDES.has(m)))];
const racine = (m) => m.replace(/(ions|ion|ements|ement|ees|ee|es|s|e)$/, '').slice(0, 7);
export function recouvrement(reponse, modele) {
  const cibles = motsDe(modele); if (!cibles.length) return { score: 1, trouves: new Set() };
  const dits = new Set(motsDe(reponse).map(racine));
  const trouves = new Set(cibles.filter((m) => dits.has(racine(m))));
  return { score: trouves.size / cibles.length, trouves };
}
function surligner(modele, trouves) {
  return modele.split(/(\s+)/).map((m) => (trouves.has(normaliser(m).replace(/[^a-z0-9-]/g, '')) ? h('mark', {}, m) : m));
}

// La restitution : tout réécrire de mémoire, puis comparer au modèle, mot clé par mot clé.
function restitution(zone, ctx, { c, niveau }) {
  return new Promise((fini) => {
    const champs = [
      ['Le problème de droit', c.probleme],
      ['La problématique', c.problematique],
      ['I.', c.plan[0][0]], ...(niveau >= 1 ? [['A.', c.plan[0][1]], ['B.', c.plan[0][2]]] : []),
      ['II.', c.plan[1][0]], ...(niveau >= 1 ? [['A.', c.plan[1][1]], ['B.', c.plan[1][2]]] : []),
    ].map(([nom, modele]) => ({ nom, modele, zone: h('textarea', { class: 'cmt-ecrit', rows: 2, 'aria-label': nom, autocapitalize: 'sentences', spellcheck: 'false' }) }));
    const valider = continuer('Comparer au modèle', () => conclure());
    function conclure() {
      const res = champs.map((x) => ({ ...x, ...recouvrement(x.zone.value, x.modele) }));
      const score = res.reduce((s, x) => s + x.score, 0) / res.length;
      ctx.combo(score >= 0.6);
      liste.replaceChildren(...res.map((x) => h('div', { class: `cmt-bilan ${x.score >= 0.6 ? 'juste' : x.score >= 0.3 ? 'moyen' : 'faux'}` },
        h('b', {}, x.nom), h('span', { class: 'cmt-pct' }, `${Math.round(x.score * 100)} %`),
        h('p', { class: 'cmt-tien' }, x.zone.value.trim() || 'Rien écrit.'),
        h('p', { class: 'cmt-modele' }, surligner(x.modele, x.trouves)))));
      valider.replaceWith(continuer('Continuer', () => fini(score)));
      window.scrollTo(0, 0);
    }
    const liste = h('div', { class: 'cmt-champs' }, champs.map((x) => h('label', { class: 'cmt-champ' }, h('b', {}, x.nom), x.zone)));
    zone.replaceChildren(h('div', { class: 'ecran cmt' }, h('div', { class: 'ecran-corps' }, enTete(c, 'restitution'),
      h('h2', { class: 'question' }, 'Écris ton commentaire de mémoire.'),
      h('p', { class: 'aide' }, niveau >= 1 ? 'Problème de droit, problématique, puis le plan complet.' : 'Problème de droit, problématique et les deux grandes parties. Les sous-parties viendront au niveau suivant.'), liste), barrePied(valider)));
    window.scrollTo(0, 0);
  });
}

// Une épreuve de la séance. round : { type: 'commentaire', id, etape }.
export async function jouerCommentaire(zone, ctx, round) {
  const c = arretDe(round.id);
  const suivi = suiviCommentaire(c.id);
  const niveau = suivi.niveau;
  let score;
  if (round.etape === 'affaire') {
    const options = melange([{ t: `${c.ref}, ${c.nom}`, ok: true }, ...autres(c.id).slice(0, 3).map((x) => ({ t: `${x.ref}, ${x.nom}`, ok: false }))]);
    const r = await qcm(zone, ctx, { surtitre: NOMS_ETAPES.affaire, question: c.affaire, sousQuestion: 'De quel arrêt s’agit-il ?', dossier: true, options, pourquoiBon: c.td, classe: 'cmt-qcm' });
    score = r.ok ? 1 : 0;
  } else if (round.etape === 'probleme') {
    if (niveau >= 2) score = await ordonner(zone, ctx, { c, etape: 'probleme', question: 'Remets le problème de droit dans l’ordre.', phrase: c.probleme });
    else {
      const options = melange([{ t: c.probleme, ok: true }, ...autres(c.id).slice(0, 2).map((x) => ({ t: x.probleme, ok: false, w: `C’est le problème de ${x.nom}.` }))]);
      const r = await qcm(zone, ctx, { surtitre: `${NOMS_ETAPES.probleme}, ${c.nom}`, question: 'Quel est le problème de droit ?', options, classe: 'cmt-qcm' });
      score = r.ok ? 1 : 0;
    }
  } else if (round.etape === 'solution') score = await trous(zone, ctx, { c, niveau });
  else if (round.etape === 'problematique') score = await ordonner(zone, ctx, { c, etape: 'problematique', question: 'Remets la problématique dans l’ordre.', phrase: c.problematique });
  else if (round.etape === 'plan') score = await plan(zone, ctx, { c, niveau });
  else score = await restitution(zone, ctx, { c, niveau });
  ctx.gain(Math.round(score * (round.etape === 'restitution' ? 40 : 20)));
  suivi.scores[round.etape] = Math.round(score * 100) / 100;
  // Fin de séance : le niveau de l'arrêt monte si la séance est solide, redescend si elle a été difficile.
  if (round.etape === 'restitution') {
    const vals = ETAPES.map((e) => suivi.scores[e] ?? 0);
    const moyenne = vals.reduce((s, v) => s + v, 0) / vals.length;
    suivi.seances++; suivi.vu = Date.now(); suivi.derniere = Math.round(moyenne * 100);
    suivi.niveau = Math.max(0, Math.min(3, suivi.niveau + (moyenne >= 0.8 ? 1 : moyenne < 0.5 ? -1 : 0)));
  }
  sauver();
  ctx.fin({ score, parfait: score === 1 });
}

export const roundsCommentaire = (id) => ETAPES.map((etape) => ({ type: 'commentaire', id, etape }));
// L'arrêt à travailler en priorité : le niveau le plus bas, puis le moins récemment vu.
export function arretPrioritaire() {
  return [...COMMENTAIRES].sort((a, b) => {
    const x = suiviCommentaire(a.id); const y = suiviCommentaire(b.id);
    return x.niveau - y.niveau || (x.vu || 0) - (y.vu || 0);
  })[0];
}
export { COMMENTAIRES };

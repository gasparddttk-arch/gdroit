// L'ARTICLE DE LA SEMAINE, avec le média Droit au but (Instagram) : un exercice par article, pour tous les niveaux.
// Le média dépose l'article la veille dans le dossier partagé ; l'exercice porte sur ce que l'article dit.
import { h } from './ui.js';
import { etat, sauver } from './state.js';
import { melange } from './engine.js';
import { qcm } from './games.js';

export const MEDIA = { nom: 'Droit au but', compte: '@media_droit_au_but' };

export const ARTICLES = [
  {
    id: '2026-11-21', titre: 'La présomption d’usage légal des armes',
    questions: [
      { q: 'Qu’a définitivement adopté le Parlement le 20 novembre 2026 ?', bonne: 'Une présomption d’usage légal des armes pour les policiers et les gendarmes',
        fausses: ['Une présomption de légitime défense pour tous les citoyens', 'L’interdiction du port d’arme pour les policiers hors service', 'Un permis d’armes pour les agents de sécurité privée'],
        pourquoi: 'Une proposition de loi, adoptée définitivement le 20 novembre 2026.' },
      { q: 'Dans quelle situation la présomption joue-t-elle ?', bonne: 'Quand un policier ou un gendarme fait usage de son arme dans l’exercice de ses fonctions',
        fausses: ['Dès qu’un policier ou un gendarme porte son arme, même hors service', 'Seulement après qu’un juge a reconnu la légitime défense', 'Seulement lors d’opérations militaires à l’étranger'],
        pourquoi: 'Elle vise l’usage de l’arme dans l’exercice des fonctions.' },
      { q: 'Qu’est-ce qui est présumé ?', bonne: 'Que l’agent a respecté les conditions légales d’usage de l’arme, notamment la nécessité et la proportionnalité',
        fausses: ['Que la personne visée a commis une infraction', 'Que l’agent était en état de légitime défense, quelles que soient les circonstances', 'Que l’agent n’engage jamais sa responsabilité'],
        pourquoi: 'L’usage de l’arme est présumé légal, sauf preuve contraire.' },
      { q: 'Quel est l’effet de cette présomption sur la preuve ?', bonne: 'Elle inverse la charge de la preuve',
        fausses: ['Elle supprime toute possibilité de preuve contraire', 'Elle oblige l’agent à prouver qu’il a agi légalement', 'Elle n’a aucun effet sur la preuve'],
        pourquoi: 'Ce n’est plus à l’agent de convaincre : c’est à l’autorité judiciaire de démontrer l’usage illégal.' },
      { q: 'Qu’est-ce que la charge de la preuve ?', bonne: 'La responsabilité de démontrer les faits que l’on avance dans une procédure',
        fausses: ['Le nombre de preuves qu’un juge doit réunir avant de statuer', 'Le coût d’une expertise, payé par la partie perdante', 'L’obligation de témoigner devant le juge'],
        pourquoi: 'Elle détermine à qui il revient d’apporter les preuves de ses affirmations.' },
      { q: 'Avec la nouvelle loi, à qui revient-il de démontrer que l’usage de l’arme était illégal ?', bonne: 'À l’autorité judiciaire',
        fausses: ['Au policier ou au gendarme lui-même', 'Au ministre de l’Intérieur', 'Au Défenseur des droits'],
        pourquoi: 'Elle doit réunir des éléments montrant que les conditions légales n’étaient pas respectées.' },
      { q: 'De quel type de présomption s’agit-il ?', bonne: 'Une présomption simple, renversable par toute preuve contraire',
        fausses: ['Une présomption irréfragable, qu’aucune preuve ne peut renverser', 'Une présomption mixte, renversable par un seul moyen de preuve', 'Une simple recommandation, sans effet juridique'],
        pourquoi: 'Elle peut être renversée à tout moment par tout élément de preuve contraire.' },
      { q: 'Vrai ou faux : avant cette loi, le policier qui faisait usage de son arme était présumé avoir respecté le cadre légal.', bonne: 'Faux',
        fausses: ['Vrai'], pourquoi: 'Jusqu’à présent, il n’était pas présumé avoir respecté le cadre légal : c’est ce que la loi change.' },
    ],
  },
];

export const articleCourant = () => ARTICLES[ARTICLES.length - 1];
export const suiviHebdo = (id) => ((etat.hebdo ||= {})[id] ||= { fait: false, meilleur: 0, vu: false });
export const roundsHebdo = (a = articleCourant()) => melange(a.questions.map((_, i) => i)).map((i, k, tout) => ({ type: 'hebdo', id: a.id, i, premier: k === 0, dernier: k === tout.length - 1 }));

export async function jouerHebdo(zone, ctx, round) {
  const a = ARTICLES.find((x) => x.id === round.id);
  const x = a.questions[round.i];
  const options = x.fausses.length === 1 ? [{ t: 'Vrai', ok: x.bonne === 'Vrai' }, { t: 'Faux', ok: x.bonne === 'Faux' }]
    : melange([{ t: x.bonne, ok: true }, ...x.fausses.map((t) => ({ t, ok: false }))]);
  const r = await qcm(zone, ctx, { surtitre: `L’article de la semaine · ${MEDIA.nom}`, question: x.q, options, pourquoiBon: x.pourquoi, classe: 'hebdo-qcm' });
  ctx.gain(r.ok ? 10 : 0);
  const s = suiviHebdo(a.id);
  if (round.premier) s.reponses = {};
  (s.reponses ||= {})[round.i] = r.ok;
  if (round.dernier) {
    const bons = Object.values(s.reponses).filter(Boolean).length;
    s.fait = true; s.meilleur = Math.max(s.meilleur, bons); s.dernier = bons; s.reponses = {};
  }
  sauver();
  ctx.fin({ score: r.ok ? 1 : 0, parfait: r.ok });
}

// Le texte de présentation, sur l'accueil et dans la fenêtre d'arrivée.
export const presentation = () => [
  h('p', {}, `Nouveau dans Gdroit : chaque semaine, un exercice sur l’article du média juridique ${MEDIA.nom}, sur Instagram (${MEDIA.compte}). Pour tous les niveaux.`),
  h('p', { class: 'hebdo-conseil' }, 'Lis l’article avant de faire l’exercice : les questions portent sur ce qu’il explique.'),
];

"""E17 — la température du sens dans le fil, mesurée sans IA, selon PROTOCOLE.md (écrit avant).
Lancer depuis attractor/ : py -3.12 -I civilisation/experiments/e17-thermo-semantique/mesure.py
Écrit resultats.json à côté de ce fichier. Graine fixe : le résultat se refait à l'identique."""
import json
import re
import sys
from pathlib import Path

import numpy as np

ICI = Path(__file__).resolve().parent
FIL = ICI.parents[2] / "registry" / "thread-sources.json"
PROJET = {"NovanBaillif", "attractor-memory"}  # textes écrits par Claude, sur une phrase de Novan
FENETRE, MELANGES, GRAINE = 10, 10_000, 17
EN = set("the and that this with for are not but you was have has from they what which their there would about can will "
         "one all been were when your more also than into only its our out who them then these those just like does "
         "how any each other because should could being over such very here".split())
FR = set("les des une est que qui dans pour pas sur avec par plus son ses aux mais tout cette comme sont elle nous vous "
         "leur être fait faire ont été très aussi donc".split())


def mots(texte):
    t = re.sub(r"```.*?```|`[^`]*`|https?://\S+|\S+@\S+", " ", texte, flags=re.S).lower()
    return re.findall(r"[a-zà-ÿ][a-zà-ÿ']{2,}", t)


def charger():
    M = sorted(json.loads(FIL.read_text(encoding="utf-8"))["comments"], key=lambda x: x["original_created_at"])
    garde = []
    for m in M:
        w = mots(m["body"])
        if sum(x in EN for x in w) > sum(x in FR for x in w):
            utiles = [x for x in w if x not in EN]
            if len(set(utiles)) >= 5:
                garde.append({"auteur": m["author"], "date": m["original_created_at"][:10], "mots": utiles,
                              "projet": m["author"] in PROJET})
    return M, garde


def matrice(garde):
    vocab = {w: i for i, w in enumerate(sorted({w for g in garde for w in g["mots"]}))}
    X = np.zeros((len(garde), len(vocab)))
    for k, g in enumerate(garde):
        for w in g["mots"]:
            X[k, vocab[w]] += 1
    return X


def _js(P, Q):
    """Divergence de Jensen-Shannon (base 2) ligne par ligne, entre deux tableaux de comptes."""
    P = P / P.sum(1, keepdims=True)
    Q = Q / Q.sum(1, keepdims=True)
    Mx = (P + Q) / 2
    with np.errstate(divide="ignore", invalid="ignore"):
        a = np.where(P > 0, P * np.log2(P / Mx), 0).sum(1)
        b = np.where(Q > 0, Q * np.log2(Q / Mx), 0).sum(1)
    return (a + b) / 2


def ecarts(X):
    """L'écart de chaque message avec les FENETRE messages d'avant (NaN pour les 3 premiers)."""
    C = np.vstack([np.zeros(X.shape[1]), np.cumsum(X, 0)])
    n = len(X)
    debut = np.maximum(np.arange(n) - FENETRE, 0)
    avant = C[np.arange(n)] - C[debut]
    e = np.full(n, np.nan)
    ok = np.arange(n) >= 3
    e[ok] = _js(X[ok], avant[ok])
    return e


def rangs(v):
    o = np.argsort(v, kind="mergesort")
    r = np.empty(len(v))
    r[o] = np.arange(len(v))
    for x in np.unique(v):  # rangs moyens en cas d'égalité
        s = v == x
        if s.sum() > 1:
            r[s] = r[s].mean()
    return r


def spearman(x, y):
    ok = ~(np.isnan(x) | np.isnan(y))
    if ok.sum() < 4:
        return float("nan")
    return float(np.corrcoef(rangs(x[ok]), rangs(y[ok]))[0, 1])


def mots_neufs(garde, ordre):
    vus, res = set(), []
    for k in ordre:
        s = set(garde[k]["mots"])
        res.append(len(s - vus) / len(s))
        vus |= s
    return np.array(res)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    tous, G = charger()
    X = matrice(G)
    n, alea = len(G), np.random.default_rng(GRAINE)
    rang = np.arange(n, dtype=float)
    e = ecarts(X)
    rho = spearman(rang, e)
    rho_neufs = spearman(rang, mots_neufs(G, range(n)))
    nul, nul_neufs = np.empty(MELANGES), np.empty(MELANGES)
    for i in range(MELANGES):
        p = alea.permutation(n)
        nul[i] = spearman(rang, ecarts(X[p]))
        nul_neufs[i] = spearman(rang, mots_neufs(G, p))
    p_h1 = float((nul <= rho).mean())

    # H1b : chaque auteur se rapproche-t-il du vocabulaire commun d'avant lui ?
    cumul = np.vstack([np.zeros(X.shape[1]), np.cumsum(X, 0)])
    auteurs = {}
    for k, g in enumerate(G):
        if k >= 3:
            auteurs.setdefault(g["auteur"], []).append(float(_js(X[k:k + 1], cumul[k:k + 1])[0]))
    h1b = {a: round(spearman(np.arange(len(d), dtype=float), np.array(d)), 3) for a, d in auteurs.items() if len(d) >= 5}
    adaptes = sum(r < -0.3 for r in h1b.values())

    # H2' (exploratoire) : l'écart des 3 messages qui suivent un message du projet, contre les autres
    projet = np.array([g["projet"] for g in G])

    def apres(marque):
        idx = sorted({j for k in np.flatnonzero(marque) for j in range(k + 1, min(k + 4, n)) if not marque[j]})
        reste = [j for j in range(3, n) if j not in idx and not marque[j]]
        return np.nanmean(e[idx]) - np.nanmean(e[reste]) if idx and reste else float("nan")
    d_h2 = float(apres(projet))
    nul_h2 = np.array([apres(alea.permutation(projet)) for _ in range(MELANGES)])
    p_h2 = float((nul_h2 >= d_h2).mean())

    # H3 (descriptif) : les plus fortes chutes de l'écart moyen sur 10 messages
    glisse = np.array([np.nanmean(e[max(3, k - 9):k + 1]) for k in range(3, n)])
    pas = np.diff(glisse)
    seuil = -2 * np.nanstd(pas)
    chutes = sorted(((float(pas[k]), G[k + 4]["date"]) for k in range(len(pas))), key=lambda x: x[0])[:3]

    res = {"messages_fil": len(tous), "messages_anglais_mesures": n, "messages_du_projet": int(projet.sum()),
           "auteurs_mesures": len({g["auteur"] for g in G}), "vocabulaire": int(X.shape[1]),
           "H1": {"rho_reel": round(rho, 3), "rho_hasard_median": round(float(np.median(nul)), 3), "p": round(p_h1, 4),
                  "retenue": bool(p_h1 < 0.05 and rho < -0.2)},
           "mots_neufs_descriptif": {"rho_reel": round(rho_neufs, 3), "rho_hasard_median": round(float(np.median(nul_neufs)), 3),
                                     "p": round(float((nul_neufs <= rho_neufs).mean()), 4)},
           "H1b": {"par_auteur": h1b, "adaptes": adaptes, "eligibles": len(h1b),
                   "adaptation_retenue": bool(h1b and adaptes > len(h1b) / 2)},
           "H2_exploratoire": {"difference": round(d_h2, 4), "p": round(p_h2, 4)},
           "H3_descriptif": {"seuil_2_ecarts_types": round(float(seuil), 4),
                             "plus_fortes_chutes": [{"pas": round(c, 4), "date": d, "au_dela_du_seuil": bool(c < seuil)} for c, d in chutes]},
           "graine": GRAINE, "melanges": MELANGES, "fenetre": FENETRE}
    res["signal"] = res["H1"]["retenue"] or res["H1b"]["adaptation_retenue"]
    (ICI / "resultats.json").write_text(json.dumps(res, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

"""Mutants : chaque fonction est une lecture fausse mais plausible du texte. Un mutant qui passe les 25 cas
désigne une règle écrite que la suite ne vérifie pas (couvrir n'est pas détecter, leçon de #85).

    py -3.12 -I mutants.py <vectors.json>
"""
import json
import posixpath
import sys
import unicodedata
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))  # lancé en -I : seul notre dossier de scripts est ajouté
from banc import egal  # noqa: E402

INV = lambda r: {"state": "invalid", "reason": r}


def base(record, *, cle=lambda k: k == "artifacts", item_ok=None, transforme=lambda v: list(v),
         null_etat="unknown", absent_etat="no_claim", filtre=False, vide_scalaire=None):
    if not isinstance(record, dict):
        return INV("record_not_object")
    cles = [k for k in record if cle(k)]
    if not cles:
        return {"state": absent_etat} if absent_etat != "known_empty" else {"state": "known_empty", "artifacts": []}
    v = record[cles[0]]
    if v is None:
        return {"state": null_etat}
    if vide_scalaire is not None and v == "":
        return vide_scalaire
    if not isinstance(v, list):
        return INV("artifacts_not_array_or_null")
    ok = item_ok or (lambda x: isinstance(x, str) and len(x) >= 1)
    if filtre:
        v = [x for x in v if ok(x)]
    elif not all(ok(x) for x in v):
        return INV("invalid_reference")
    if not v:
        return {"state": "known_empty", "artifacts": []}
    return {"state": "provided", "artifacts": transforme(v)}


def sans_doublons(v):
    vus, out = set(), []
    for x in v:
        if x not in vus:
            vus.add(x)
            out.append(x)
    return out


MUTANTS = {
    "reference (lecture juste)": lambda r: base(r),
    "doublons retirés": lambda r: base(r, transforme=sans_doublons),
    "références triées": lambda r: base(r, transforme=sorted),
    "espaces retirés aux bords": lambda r: base(r, transforme=lambda v: [x.strip() for x in v]),
    "chaîne d'espaces refusée": lambda r: base(r, item_ok=lambda x: isinstance(x, str) and x.strip() != ""),
    "normalisation Unicode NFC": lambda r: base(r, transforme=lambda v: [unicodedata.normalize("NFC", x) for x in v]),
    "normalisation Unicode NFKC": lambda r: base(r, transforme=lambda v: [unicodedata.normalize("NFKC", x) for x in v]),
    "casse repliée": lambda r: base(r, transforme=lambda v: [x.casefold() for x in v]),
    "clé insensible à la casse (Artifacts)": lambda r: base(r, cle=lambda k: k.lower() == "artifacts"),
    "éléments invalides écartés en silence": lambda r: base(r, filtre=True),
    "nombres acceptés comme références": lambda r: base(r, item_ok=lambda x: (isinstance(x, str) and x != "") or (isinstance(x, (int, float)) and not isinstance(x, bool))),
    "null confondu avec l'absence": lambda r: base(r, null_etat="no_claim"),
    "absence lue comme collection vide": lambda r: base(r, absent_etat="known_empty"),
    "chaîne vide seule lue comme collection vide": lambda r: base(r, vide_scalaire={"state": "known_empty", "artifacts": []}),
    "caractères invisibles (largeur nulle) refusés": lambda r: base(r, item_ok=lambda x: isinstance(x, str) and x.replace("​", "").replace("‍", "").replace("﻿", "") != ""),
    "chemins normalisés (./a/../b → b)": lambda r: base(r, transforme=lambda v: [posixpath.normpath(x) if "/" in x else x for x in v]),
    "adresses décodées (%20 → espace)": lambda r: base(r, transforme=lambda v: [urllib.parse.unquote(x) for x in v]),
    "tableau de tableaux aplati": lambda r: base({**r, "artifacts": [y for x in r["artifacts"] for y in (x if isinstance(x, list) else [x])]} if isinstance(r, dict) and isinstance(r.get("artifacts"), list) else r),
}


def main(chemin):
    cas = json.loads(Path(chemin).read_text(encoding="utf-8"))["cases"]
    for nom, f in MUTANTS.items():
        rates = [c["name"] for c in cas if not egal(json.loads(json.dumps(f(json.loads(json.dumps(c["input"]))))), c["expected"])]
        verdict = "TUÉ" if rates else "SURVIT"
        print(f"{verdict:6} {nom:45} {len(cas) - len(rates)}/{len(cas)}" + (f"  (attrapé par : {rates[0]})" if rates else ""))


if __name__ == "__main__":
    main(sys.argv[1])

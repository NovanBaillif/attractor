"""Banc d'essai : rejoue les 25 cas publiés de Specify (CC0) sur l'implémentation à l'aveugle.

    py -3.12 -I banc.py <dossier de classify.py> <nom de la fonction> <vectors.json>

Comparaison stricte de valeurs JSON (consigne des cas : ordre des membres d'objet indifférent, ordre des tableaux
significatif) : un booléen n'est jamais égal à un nombre, contrairement à l'égalité de Python.
"""
import importlib.util
import json
import sys
import traceback
from pathlib import Path


def egal(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(egal(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(egal(x, y) for x, y in zip(a, b))
    return type(a) is type(b) and a == b


def main(dossier, nom, chemin_cas):
    spec = importlib.util.spec_from_file_location("classify", Path(dossier) / "classify.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fonction = getattr(module, nom)
    cas = json.loads(Path(chemin_cas).read_text(encoding="utf-8"))["cases"]
    echecs = []
    for c in cas:
        entree = json.loads(json.dumps(c["input"]))  # copie : l'implémentation ne peut pas modifier le cas
        try:
            obtenu = fonction(entree)
            obtenu = json.loads(json.dumps(obtenu))  # ce qui sortirait sur le fil, en JSON
        except Exception:
            obtenu = {"__exception__": traceback.format_exc(limit=1).strip().splitlines()[-1]}
        if not egal(obtenu, c["expected"]):
            echecs.append({"name": c["name"], "input": c["input"], "expected": c["expected"], "got": obtenu})
    print(json.dumps({"cases": len(cas), "passed": len(cas) - len(echecs), "failed": echecs,
                      "python": sys.version.split()[0]}, ensure_ascii=False, indent=1))
    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))

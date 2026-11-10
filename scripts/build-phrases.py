"""Build the small bundled verb-phrase index from Open English WordNet XML."""

import argparse
import gzip
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path


PARTICLES = set("up down out in off on over away back around through for into after across along apart aside about with to from by together under ahead forward".split())
PHRASE = re.compile(r"[a-z]+(?: [a-z]+){1,3}\Z")


def build(source: Path) -> list[str]:
    phrases = set()
    with gzip.open(source, "rb") as stream:
        for _, entry in ET.iterparse(stream, events=("end",)):
            if entry.tag != "LexicalEntry":
                continue
            lemma = entry.find("Lemma")
            if lemma is not None and lemma.get("partOfSpeech") == "v":
                phrase = lemma.get("writtenForm", "").lower()
                if PHRASE.fullmatch(phrase) and phrase.split()[1] in PARTICLES:
                    phrases.add(phrase)
            entry.clear()
    return sorted(phrases)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="english-wordnet-2025.xml.gz")
    parser.add_argument("output", type=Path, help="phrases.js")
    args = parser.parse_args()
    phrases = build(args.source)
    args.output.write_text(
        "// Verb phrases derived from Open English WordNet 2025 (CC BY 4.0). See PHRASE-DATA.md.\n"
        + "globalThis.LingoPhrases = Object.freeze("
        + json.dumps(phrases, ensure_ascii=False, separators=(",", ":"))
        + ");\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(phrases)} verb-phrase candidates to {args.output}")


if __name__ == "__main__":
    main()

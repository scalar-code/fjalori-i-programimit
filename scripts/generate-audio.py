"""
Creates the "Dëgjo" audio for every term: the Albanian explanation, read aloud by the
Edon voice from folsh.ai (https://folsh.ai, CC0 public domain, by Edon Sekiraqa).

Only terms that are new or whose explanation changed are generated, so after adding a
few terms this takes seconds. Files go to audio/<id>.m4a, plus audio/manifest.json.

One-time setup (the voice is ~64 MB, so it is NOT stored in the project):
    python3 -m venv ~/.fjalori-tts
    ~/.fjalori-tts/bin/pip install piper-tts
    Download sq_AL-edon-medium.onnx and sq_AL-edon-medium.onnx.json from
    https://huggingface.co/edonseki/folsh.ai/tree/main/edon  into the same folder.

Run (macOS; uses the built-in afconvert, or ffmpeg if installed):
    ~/.fjalori-tts/bin/python scripts/generate-audio.py --model /path/to/sq_AL-edon-medium.onnx
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio"
MANIFEST = AUDIO_DIR / "manifest.json"


def speakable(text: str) -> str:
    """Small fixes so the voice reads the text naturally."""
    replacements = {
        "p.sh.": "për shembull",
        "etj.": "e të tjera",
        "„": "", "“": "", "”": "", '"': "",
        " — ": ", ", "—": ", ", " – ": ", ",
        "=>": " shigjeta ",
        "==": " barazohet me ",
        "&&": " dhe ", "||": " ose ",
        "<": "", ">": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return re.sub(r"\s+", " ", text).strip()


def fingerprint(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


def to_m4a(wav: Path, out: Path) -> None:
    if shutil.which("afconvert"):
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "40000", str(wav), str(out)], check=True)
    elif shutil.which("ffmpeg"):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-c:a", "aac", "-b:a", "40k", str(out)], check=True)
    else:
        sys.exit("Need afconvert (macOS) or ffmpeg to compress the audio.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", default=os.environ.get("FOLSH_MODEL"), help="path to sq_AL-edon-medium.onnx")
    parser.add_argument("--only", nargs="*", help="only these term ids (default: all that changed)")
    args = parser.parse_args()
    if not args.model or not Path(args.model).is_file():
        sys.exit("Pass --model /path/to/sq_AL-edon-medium.onnx (or set FOLSH_MODEL). See the top of this file.")

    import piper
    from piper import PiperVoice

    terms = json.loads((ROOT / "data/terms.json").read_text("utf-8"))["terms"]
    AUDIO_DIR.mkdir(exist_ok=True)
    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {}

    todo = []
    for term in terms:
        text = speakable(term["explanation"]["sq"])
        stamp = fingerprint(text)
        file = AUDIO_DIR / f"{term['id']}.m4a"
        wanted = args.only is None or term["id"] in args.only
        if wanted and (manifest.get(term["id"]) != stamp or not file.exists()):
            todo.append((term["id"], text, stamp, file))

    # Remove audio for terms that no longer exist
    ids = {t["id"] for t in terms}
    for gone in [i for i in manifest if i not in ids]:
        (AUDIO_DIR / f"{gone}.m4a").unlink(missing_ok=True)
        del manifest[gone]

    if todo:
        # espeak-ng (inside piper) can't handle very long folder paths, so load its data
        # with a short relative path from inside the piper package folder.
        model = Path(args.model).resolve()
        os.chdir(Path(piper.__file__).parent)
        voice = PiperVoice.load(model, espeak_data_dir="espeak-ng-data")

        with tempfile.TemporaryDirectory() as tmp:
            for n, (term_id, text, stamp, file) in enumerate(todo, 1):
                wav = Path(tmp) / f"{term_id}.wav"
                with wave.open(str(wav), "wb") as out:
                    voice.synthesize_wav(text, out)
                to_m4a(wav, file)
                manifest[term_id] = stamp
                print(f"  [{n}/{len(todo)}] {term_id}")

    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + "\n", "utf-8")
    total = sum(f.stat().st_size for f in AUDIO_DIR.glob("*.m4a")) / 1e6
    print(f"✓ {len(todo)} generated · {len(manifest)}/{len(terms)} terms have audio · {total:.1f} MB")


if __name__ == "__main__":
    main()

# Vidéo Gemini sur fond uni (vert ou magenta) -> planches WebP détourées pour lexou.js.
# Usage : python3 scripts/planches.py video.mp4 nom debut fin [vert|magenta] [hauteur]
# Écrit app/img/lexou/<nom>-<k>.webp (30 images par planche, 10 par ligne, 12 images/s)
# et affiche la ligne à ajouter dans ANIMATIONS (lexou.js).
import subprocess, sys, tempfile, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

video, nom, debut, fin = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
fond = sys.argv[5] if len(sys.argv) > 5 else 'vert'
HAUT = int(sys.argv[6]) if len(sys.argv) > 6 else 420
IPS, COL, PAR = 12, 10, 30

tmp = pathlib.Path(tempfile.mkdtemp())
subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(debut), '-to', str(fin), '-i', video,
                '-vf', f'fps={IPS}', str(tmp / '%04d.png')], check=True)
images = sorted(tmp.glob('*.png'))

def detourer(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Écart à la couleur du fond : plus il est grand, plus le pixel appartient au personnage.
    ecart = (g - np.maximum(r, b)) if fond == 'vert' else (np.minimum(r, b) - g)
    alpha = np.clip(1 - (ecart - 30) / 60, 0, 1)
    # Retire le reflet de fond sur les bords.
    if fond == 'vert': a[..., 1] = np.minimum(g, np.maximum(r, b) + 8)
    else:
        m = np.maximum(g + 8, 0); a[..., 0] = np.minimum(r, m + (r - b).clip(0)); a[..., 2] = np.minimum(b, m + (b - r).clip(0))
    # Efface les petites taches isolées (paillettes, bruit) qui élargiraient le cadrage.
    zones, nb = ndimage.label(alpha > 0.15)
    if nb > 1:
        tailles = ndimage.sum(np.ones_like(alpha), zones, range(1, nb + 1))
        petites = np.isin(zones, np.nonzero(tailles < alpha.size * 0.0005)[0] + 1)
        alpha[petites] = 0
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

cadres = [detourer(p) for p in images]
boites = [c.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for c in cadres]
x0 = min(b[0] for b in boites if b); y0 = min(b[1] for b in boites if b)
x1 = max(b[2] for b in boites if b); y1 = max(b[3] for b in boites if b)
x0, y0, x1, y1 = max(0, x0 - 4), max(0, y0 - 4), x1 + 4, y1 + 4
h = HAUT; l = round((x1 - x0) * h / (y1 - y0))
cadres = [c.crop((x0, y0, x1, y1)).resize((l, h), Image.LANCZOS) for c in cadres]
n = len(cadres) - len(cadres) % COL  # lignes pleines
cadres = cadres[:n]
sortie = pathlib.Path('app/img/lexou')
for k in range(0, n, PAR):
    lot = cadres[k:k + PAR]
    lignes = (len(lot) + COL - 1) // COL
    planche = Image.new('RGBA', (COL * l, PAR // COL * h), (0, 0, 0, 0))
    for i, c in enumerate(lot):
        planche.paste(c, ((i % COL) * l, (i // COL) * h))
    planche.save(sortie / f'{nom}-{k // PAR}.webp', quality=82, method=6)
print(f"  '{nom}': {{ l: {l}, h: {h}, images: {n}, boucle: true }},")

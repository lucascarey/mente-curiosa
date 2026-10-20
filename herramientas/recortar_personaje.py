"""Recorta los 12 frames de la planilla del personaje, los alinea con el primero y les quita el fondo negro.

Uso: python herramientas/recortar_personaje.py planilla.jpg assets/personaje
La planilla es de 4 columnas por 3 filas sobre fondo negro, en el orden de mc/plantilla/personaje.js.
"""
from PIL import Image; import numpy as np, sys
from scipy import ndimage
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
alto_img, ancho_img = im.shape[:2]
W=ancho_img/4
R=[(16,616),(741,1335),(1495,2150)]  # filas de dibujos, sin los textos de abajo
PAD=90; H=660; ANCHO=int(W)+2*PAD
# Borra los números (blancos) de la esquina de cada celda, sin tocar el pelo naranja
for y0,_ in R:
    for c in range(4):
        x0=int(c*W)
        caja=im[y0:y0+110, x0:x0+130]
        blanco=(caja[...,0]-caja[...,2])<50
        caja[blanco]=0
CORTES_FILA3=[505,970,1436]  # medidos sobre la planilla original
cells=[]
for y0,y1 in R:
    fila=np.zeros((H,ancho_img,3),np.float32)
    fila[:y1-y0]=im[y0:y1]
    # Cortes verticales entre personajes; en la última fila las manos cruzan el borde de la celda
    cortes=[0]+(CORTES_FILA3 if y0==R[2][0] else [int(W*k) for k in (1,2,3)])+[ancho_img]
    L=np.zeros(fila.shape[:2],np.int32)
    for c in range(4):
        L[:, cortes[c]:cortes[c+1]]=c+1
    for c in range(4):
        propia=np.where((L==c+1)[...,None],fila,0)
        cx0=int(c*W)-PAD
        cell=np.zeros((H,ANCHO,3),np.float32)
        a,b=max(0,cx0),min(ancho_img,cx0+ANCHO)
        part=propia[:, a:b]
        cell[:part.shape[0], a-cx0:a-cx0+part.shape[1]]=part
        cells.append(cell)
def mascara(a): return (a.max(axis=2)>25).astype(np.float32)[:360]
base=mascara(cells[0])
def desplazar(a,dy,dx):
    out=np.zeros_like(a)
    ys=slice(max(0,dy),a.shape[0]+min(0,dy)); yo=slice(max(0,-dy),a.shape[0]+min(0,-dy))
    xs=slice(max(0,dx),a.shape[1]+min(0,dx)); xo=slice(max(0,-dx),a.shape[1]+min(0,-dx))
    out[ys,xs]=a[yo,xo]; return out
def mejor(b):
    m=mascara(b); best=(-1,0,0)
    for dy in range(-50,51):
        for dx in range(-40,41):
            s=(desplazar(m,dy,dx)*base).sum()
            if s>best[0]: best=(s,dy,dx)
    return best[1:]
for i,cell in enumerate(cells):
    dy,dx=mejor(cell) if i else (0,0)
    print(i+1,dy,dx)
    al=desplazar(cell,dy,dx)
    alpha=np.clip((al.max(axis=2)-10)/18,0,1)
    # Saca restos sueltos de los personajes vecinos
    lab,n=ndimage.label(alpha>0)
    if n>1:
        tam=ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
        alpha[np.isin(lab,[k+1 for k in range(n) if tam[k]<400])]=0
    Image.fromarray(np.dstack([al,alpha*255]).clip(0,255).astype(np.uint8),'RGBA').save(f'{sys.argv[2]}/{i+1:02d}.png')

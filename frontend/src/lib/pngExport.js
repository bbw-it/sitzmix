// Wählt die Pixeldichte für den PNG-Export.
//
// Der Rasteraufwand von html-to-image wächst mit (Fläche × pixelRatio²) — der
// teure, speicherhungrige Schritt, der schwache Geräte einfrieren lässt. Statt
// fix `pixelRatio: 2` zu nehmen, wird die Dichte an das Gerät und die Plangrösse
// angepasst: scharf genug für Druck/Projektion, aber gedeckelt.

export const MAX_EXPORT_DIMENSION = 2600;   // längste Bitmap-Kante in px

export function computeExportPixelRatio({ width, height, deviceMemory, maxDimension = MAX_EXPORT_DIMENSION } = {}) {
  // Basis 2 für scharfe Ausgabe. Meldet das Gerät wenig Arbeitsspeicher
  // (Chrome: navigator.deviceMemory in GB), auf 1.5 senken — das halbiert grob
  // die Rasterfläche und damit CPU/Speicher.
  let ratio = (typeof deviceMemory === 'number' && deviceMemory <= 4) ? 1.5 : 2;

  // Obergrenze der Bitmap: verhindert, dass ein sehr breiter Plan (grosser
  // Bildschirm) durch Hochskalieren ein riesiges Canvas erzeugt. Nie unter 1 —
  // darunter würde nur unscharf herunterskaliert.
  const longest = Math.max(width || 0, height || 0);
  if (longest > 0) ratio = Math.min(ratio, maxDimension / longest);

  return Math.max(1, ratio);
}

/** Crop to a centred square and shrink to 240px so uploads stay small. */
export function squarePhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a picture'));
      img.onload = () => {
        const size = 240;
        const side = Math.min(img.width, img.height);
        const cv = document.createElement('canvas');
        cv.width = size;
        cv.height = size;
        const ctx = cv.getContext('2d');
        if (!ctx) return reject(new Error('Could not process the picture'));
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the picture'))), 'image/jpeg', 0.82);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

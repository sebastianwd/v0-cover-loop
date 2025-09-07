export const base64ToBlobUrl = (
  base64Data: string,
  mimeType: string = "image/png"
): string => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
};

export const createCompositeAlbumImage = async (options: {
  albumCoverUrl: string;
  backgroundUrl: string;
  albumCoverScale: number;
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { albumCoverUrl, backgroundUrl, albumCoverScale = 0.2 } = options;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const backgroundImg = new Image();
    backgroundImg.crossOrigin = "anonymous";
    backgroundImg.onload = () => {
      // Set canvas size to match background image dimensions
      canvas.width = backgroundImg.width;
      canvas.height = backgroundImg.height;

      // Draw background at full size
      ctx.drawImage(backgroundImg, 0, 0);

      // Load album cover
      const albumImg = new Image();
      albumImg.crossOrigin = "anonymous";
      albumImg.onload = () => {
        // Calculate album cover size (you can adjust the scale)
        const albumSize = Math.min(
          canvas.width * albumCoverScale,
          canvas.height * albumCoverScale
        );
        const albumX = (canvas.width - albumSize) / 2;
        const albumY = (canvas.height - albumSize) / 2;

        // Add a subtle shadow/glow effect behind the album cover
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        // Draw album cover at center
        ctx.drawImage(albumImg, albumX, albumY, albumSize, albumSize);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const compositeDataUrl = canvas.toDataURL("image/png");
        resolve(compositeDataUrl);
      };
      albumImg.onerror = () => reject(new Error("Failed to load album cover"));
      albumImg.src = albumCoverUrl;
    };
    backgroundImg.onerror = () =>
      reject(new Error("Failed to load background"));
    backgroundImg.src = backgroundUrl;
  });
};

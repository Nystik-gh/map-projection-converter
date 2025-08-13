/**
 * Convert a Mercator-projected map to Equirectangular projection.
 * @param {HTMLImageElement|HTMLCanvasElement} mercatorImage - The Mercator source image.
 * @param {number} outWidth - Width of output equirectangular map.
 * @param {number} outHeight - Height of output equirectangular map.
 * @returns {HTMLCanvasElement} - Canvas containing the equirectangular image.
 */
const mercatorToEquirectangular = (
  mercatorImage,
  outWidth,
  outHeight
) => {
  const inCanvas = document.createElement('canvas')
  inCanvas.width = mercatorImage.width
  inCanvas.height = mercatorImage.height
  const inCtx = inCanvas.getContext('2d')
  inCtx.drawImage(mercatorImage, 0, 0)
  const inData = inCtx.getImageData(
    0,
    0,
    inCanvas.width,
    inCanvas.height
  )

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outWidth
  outCanvas.height = outHeight
  const outCtx = outCanvas.getContext('2d')
  const outImageData = outCtx.createImageData(outWidth, outHeight)
  const outData = outImageData.data

  const wIn = inCanvas.width
  const hIn = inCanvas.height

  const phiMax = (85.05112878 * Math.PI) / 180
  const yMax = Math.log(Math.tan(Math.PI / 4 + phiMax / 2))

  for (let yOut = 0; yOut < outHeight; yOut++) {
    const phi = Math.PI / 2 - (yOut / outHeight) * Math.PI

    for (let xOut = 0; xOut < outWidth; xOut++) {
      const lambda = (xOut / outWidth) * 2 * Math.PI - Math.PI

      const xMercNorm = (lambda + Math.PI) / (2 * Math.PI)
      const yMercNorm =
        (yMax - Math.log(Math.tan(Math.PI / 4 + phi / 2))) /
        (2 * yMax)

      const xMercPx = Math.floor(xMercNorm * wIn)
      const yMercPx = Math.floor(yMercNorm * hIn)

      if (
        xMercPx >= 0 &&
        xMercPx < wIn &&
        yMercPx >= 0 &&
        yMercPx < hIn
      ) {
        const inIndex = (yMercPx * wIn + xMercPx) * 4
        const outIndex = (yOut * outWidth + xOut) * 4

        outData[outIndex] = inData.data[inIndex]
        outData[outIndex + 1] = inData.data[inIndex + 1]
        outData[outIndex + 2] = inData.data[inIndex + 2]
        outData[outIndex + 3] = inData.data[inIndex + 3]
      }
    }
  }

  outCtx.putImageData(outImageData, 0, 0)
  return outCanvas
}

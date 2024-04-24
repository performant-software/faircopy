const style = "'stroke:#fff;stroke-dasharray:5;stroke-opacity:0.3;stroke-width:1;fill:transparent;'"

const buildSquareFragment = (ulx, uly, lrx, lry) => `xywh=pixel:${ulx},${uly},${lrx - ulx},${lry - uly}`

const buildPolygonSvg = (points) => `
<svg>
<polygon points='${points.join(' ')}' style=${style}>
</polygon>
</svg>`.replaceAll('\n', '');

module.exports = {
  buildSquareFragment,
  buildPolygonSvg
}

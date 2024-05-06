const style = "'stroke:#fff;stroke-dasharray:5;stroke-opacity:0.3;stroke-width:1;fill:transparent;'"

export function buildSquareFragment(ulx, uly, lrx, lry) {
  return `xywh=pixel:${ulx},${uly},${lrx - ulx},${lry - uly}`
}

export function buildPolygonSvg(points) {
  return `<svg><polygon points='${points}' style=${style}></polygon></svg>`.replaceAll('\n', '');
} 
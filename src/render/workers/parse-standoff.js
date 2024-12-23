export function parseStandoff(xml) {
  let ret = [];
  const parser = new DOMParser()

  const xmlDoc = parser.parseFromString(xml, "text/xml")

  const standOff = xmlDoc.querySelector('standOff')

  if (standOff) {
    const type = standOff.getAttribute('type')

    // if (type && type === 'recogito_studio_annotations') {
    const listAnnotation = standOff.querySelector('listAnnotation')

    if (listAnnotation) {
      const annotations = listAnnotation.querySelectorAll('annotation')

      annotations.forEach(a => {
        const id = a.getAttribute('xml:id')
        const path = a.getAttribute('target')
        const note = a.querySelector('note')
        const annotation = note ? note.textContent : ''
        const resp = a.querySelector('respStmt')
        let author = ''
        if (resp) {
          const name = resp.querySelector('name')
          author = name ? name.textContent : ''
        }

        ret.push({
          id, path, annotation, author
        })
      })
    }
    //}
  }

  return ret;
}
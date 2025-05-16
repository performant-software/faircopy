export function serializeStandoff(xml, newData) {
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

        // Fnd the annotation in the new data
        const found = newData.find(d => d.id === id);
        if (found) {
          if (found.path !== path) {
            console.log('Writing new path!')
            console.log('Old path: ', path)
            console.log('New path: ', found.path)
          }
          a.setAttribute('target', found.path)
        }
      })
    }
    //}
  }

  return '<?xml version="1.0" encoding="UTF-8"?>' + xmlDoc.documentElement.outerHTML
}

export function convertToHTML( xml ) {
    const xmlDoc = new DOMParser().parseFromString(xml,"text/xml")
    const data = domToHTML5(xmlDoc.documentElement)
    return data.outerHTML
}

// Converts the supplied XML DOM into HTML5 Custom Elements. 
export function domToHTML5(XML_dom){
    const convertEl = (el) => {
        // Elements with defined namespaces get the prefix mapped to that element. All others keep
        // their namespaces and are copied as-is.
        const prefix = 'tei';
        const newElement = document.createElement(prefix + "-" + el.localName);
        // Copy attributes; @xmlns, @xml:id, @xml:lang, and
        // @rendition get special handling.
        for (const att of Array.from(el.attributes)) {
            if (att.name === "xmlns") {
                newElement.setAttribute("data-xmlns", att.value); //Strip default namespaces, but hang on to the values
            } else {
                newElement.setAttribute(att.name, att.value);
            }
            if (att.name === "xml:id") {
                newElement.setAttribute("id", att.value);
            }
            if (att.name === "xml:lang") {
                newElement.setAttribute("lang", att.value);
            }
            if (att.name === "rendition") {
                newElement.setAttribute("class", att.value.replace(/#/g, ""));
            }
        }

        for (const node of Array.from(el.childNodes)){
            if (node.nodeType === document.defaultView.Node.ELEMENT_NODE) {
                newElement.appendChild(  convertEl(node)  );
            }
            else {
                newElement.appendChild(node.cloneNode());
            }
        }
        return newElement;
    }

    return convertEl(XML_dom);
}
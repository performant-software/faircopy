import React, { Component } from 'react'
import Parser from './Parser'

const fairCopy = window.fairCopy

export default class PreviewWindow extends Component {

    constructor() {
        super()
        this.state = {
            resourceEntry: null,
            teiDocHTML: null,
            projectCSS: ""
        }	
    }

    onUpdate = (e, previewData) => {
        const projectCSS = previewData?.projectCSS
        const teiDocHTML = previewData?.teiDocXML ? convertToHTML(previewData.teiDocXML) : null
        if( projectCSS ) {
            updateStyleSheet(projectCSS)
        }
        this.setState({ ...this.state, ...previewData, teiDocHTML })
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('updatePreview', this.onUpdate )
    }
    
    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('updatePreview', this.onUpdate )
    }

    renderSpinner() {
        return (
            <div id="PreviewWindow">
                <h1>Loading...</h1>
            </div>
        )
    }

    render() {
        const { resourceEntry, teiDocHTML } = this.state
        if(!resourceEntry || !teiDocHTML ) return this.renderSpinner()

        const htmlToReactParserOptionsSide = htmlToReactParserOptions()

        return (
            <div id="PreviewWindow">
                <h1>{resourceEntry.name}</h1>
                <div id='preview-viewer'>
                    <Parser
                        html={teiDocHTML}
                        htmlToReactParserOptionsSide={htmlToReactParserOptionsSide}
                    />
                </div>
            </div>
        )
    }
}

const htmlToReactParserOptions = () => {
    const parserOptions = {
      replace(domNode) {
        switch (domNode.name) {
          default:
            /* Otherwise, Just pass through */
            return domNode;
        }
      },
    };
    return parserOptions;
};

function updateStyleSheet(projectCSS) {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(projectCSS)
    document.adoptedStyleSheets = [sheet]
}
  
function convertToHTML( xml ) {
    try {
        const doc = new DOMParser().parseFromString(xml,"text/xml")
        const data = domToHTML5(doc.documentElement)
        return data.outerHTML
    } catch( err ) {
        console.error(`ERROR ${err}: ${err.stack}`)
    }
    return null
}


// Converts the supplied XML DOM into HTML5 Custom Elements. 
function domToHTML5(XML_dom){
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
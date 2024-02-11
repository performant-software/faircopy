import React, { Component } from 'react'
import Parser from './Parser'
import domToReact from 'html-react-parser/lib/dom-to-react';

import { Button, Tooltip } from '@material-ui/core'
import { bigRingSpinner } from '../common/ring-spinner'
import TitleBar from '../main-window/TitleBar'

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
                { bigRingSpinner() }
            </div>
        )
    }


    renderToolbar() {
        const textButtonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true,
            variant: "outlined",
            size: 'small',      
        }

        return (
            <div className="toolbar">
                <Button {...textButtonProps}>test</Button>
            </div>
        )
    }

    render() {
        const { resourceEntry, teiDocHTML } = this.state
        if(!resourceEntry || !teiDocHTML ) return this.renderSpinner()

        const htmlToReactParserOptionsSide = htmlToReactParserOptions()

        return (
            <div id="PreviewWindow">
                <TitleBar 
                    resourceName={ resourceEntry.name } 
                    isPreviewWindow={true}
                    currentView={'home'}
                >
                </TitleBar>
                { this.renderToolbar() }
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
            case 'tei-ref': 
                return parseLink(domNode, parserOptions)
            case 'tei-figure': 
                return parseFigure(domNode)
            default: 
                return domNode
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

function parseGraphic(domNode) {
    const src = domNode.attribs?.url;
    let desc = ""
    for( const child of domNode.children ) {
        if( child.name === 'tei-desc') {
            desc = child.children[0]?.data
        }
    }
    return { src, desc }
}

function parseLink( domNode, parserOptions) {
    const target = domNode.attribs?.target
    if( !target ) return domNode

    const onClickAnchorTag = (e) => {
        e.preventDefault()
        const anchor = document.querySelector(target)
        if( anchor ) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const onClickExternal = (e) => {
        fairCopy.services.ipcSend('openWebpage', target)
    }
    const refRend = domNode.attribs?.rend
    const refRendition = domNode.attribs?.rendition
    const onClick = target.startsWith('#') ? onClickAnchorTag : onClickExternal
    return <tei-ref rend={refRend} rendition={refRendition} onClick={onClick}>{domToReact(domNode.children, parserOptions)}</tei-ref>
}

function parseFigure(domNode) {
    for( const child of domNode.children ) {
        if( child.name === 'tei-graphic' ) {
            const { src, desc } = parseGraphic(child)     
            if( !src ) return domNode
            const figureRend = domNode.attribs?.rend
            const figureRendition = domNode.attribs?.rendition
            return (
                <tei-figure>
                    <tei-graphic>
                        <img src={src} alt={desc || ''} rend={figureRend} rendition={figureRendition} />
                    </tei-graphic>
                </tei-figure>
            );              
        }
    }
    return domNode
}
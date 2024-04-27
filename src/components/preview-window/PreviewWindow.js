import React, { Component } from 'react'
import Parser from './Parser'
import domToReact from 'html-react-parser/lib/dom-to-react';
import EditionCrafter from '@cu-mkp/editioncrafter'

import { Button } from '@material-ui/core'
import { bigRingSpinner } from '../common/ring-spinner'
import TitleBar from '../main-window/TitleBar'

const fairCopy = window.fairCopy

export default class PreviewWindow extends Component {

    constructor() {
        super()
        this.state = {
            resourceEntry: null,
            projectCSS: ""
        }	
    }

    onUpdate = (e, previewData) => {
        const projectCSS = previewData?.projectCSS
        if( projectCSS ) {
            updateStyleSheet(projectCSS)
        }
        this.setState({ ...this.state, ...previewData })
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
        const { resourceEntry } = this.state
        if( !resourceEntry ) return this.renderSpinner()

        const iiifManifest = `file://ec/${resourceEntry.localID}/iiif/manifest.json`
        // const iiifManifest = "https://cu-mkp.github.io/bic-editioncrafter-data/eng-415-145a/iiif/manifest.json"
        // const htmlToReactParserOptionsSide = htmlToReactParserOptions()

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
                <EditionCrafter
                    documentName={resourceEntry.name}
                    transcriptionTypes={{
                        tc: 'Diplomatic (FR)',
                        tcn: 'Normalized (FR)',
                        tl: 'Translation (EN)'
                    }}
                    iiifManifest={iiifManifest}
                />
                    {/* <Parser
                        html={teiDocHTML}
                        htmlToReactParserOptionsSide={htmlToReactParserOptionsSide}
                    /> */}
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
    return <tei-ref id={domNode.attribs.id} rend={refRend} rendition={refRendition} onClick={onClick}>{domToReact(domNode.children, parserOptions)}</tei-ref>
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
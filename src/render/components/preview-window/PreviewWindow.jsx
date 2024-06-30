import React, { Component } from 'react'
import Parser from './Parser'
import domToReact from 'html-react-parser/lib/dom-to-react';
import EditionCrafter from '@cu-mkp/editioncrafter'

import { Button, ButtonGroup } from '@material-ui/core'
import { bigRingSpinner } from '../common/ring-spinner'
import TitleBar from '../main-window/TitleBar'

const fairCopy = window.fairCopy

export default class PreviewWindow extends Component {

    constructor(props) {
        super()
        const { resourceEntry, layers, layerID, projectCSS } = props
        if( projectCSS ) {
            updateStyleSheet(projectCSS)
        }
        this.state = {
            resourceEntry, layers, layerID,
            mode: 'reading'
        }	
    }

    onUpdate = (e, previewData) => {
        const projectCSS = previewData.projectCSS
        const surfaceID = previewData.surfaceID
        const { resourceEntry, layers, layerID } = previewData

        if( projectCSS ) {
            updateStyleSheet(projectCSS)
        }

        if( surfaceID ) {
            window.location.assign(`#/ec/${surfaceID}/f/${surfaceID}/${layerID}`)
        } else {
            window.location.assign(`#/ec`)
        }

        this.setState({...this.state, resourceEntry, layers, layerID, surfaceID })
    }

    componentDidMount() {
        fairCopy.ipcRegisterCallback('updatePreview', this.onUpdate )
    }
    
    componentWillUnmount() {
        fairCopy.ipcRemoveListener('updatePreview', this.onUpdate )
    }

    renderSpinner() {
        return (
            <div id="PreviewWindow">
                { bigRingSpinner() }
            </div>
        )
    }

    renderToolbar() {
        const { mode } = this.state

        const textButtonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true
        }

        const onReading = () => { this.setState({...this.state, mode: 'reading'} )}
        const onDocumentary = () => { this.setState({...this.state, mode: 'documentary'} )}
        const readingSelected = mode === 'reading' ? { variant: "contained" } : {}
        const docSelected = mode === 'documentary' ? { variant: "contained" } : {}

        return (
            <div className="toolbar">                
                <ButtonGroup className="mode-buttons" color="primary" aria-label="outlined primary button group">
                    <Button {...textButtonProps } { ...readingSelected } onClick={onReading}>Reading</Button>
                    <Button {...textButtonProps } { ...docSelected } onClick={onDocumentary}>Documentary</Button>    
                </ButtonGroup>
            </div>
        )
    }

    render() {
        const { resourceEntry, layers, layerID, mode } = this.state
        const { name: resourceName, localID } = resourceEntry

        const iiifManifest = `ec://ec/${localID}/iiif/manifest.json`
        const htmlToReactParserOptionsSide = htmlToReactParserOptions()
        const { html } = layers[layerID]
        const transcriptionTypes = {}
        for( const layer of Object.keys(layers) ) {
            transcriptionTypes[layer] = layers[layer].name
        }

        return (
            <div id="PreviewWindow">
                <TitleBar 
                    resourceName={resourceName} 
                    isPreviewWindow={true}
                    currentView={'home'}
                >
                </TitleBar>
                { this.renderToolbar() }
                <div id='preview-viewer'>
                    { mode === 'documentary' && <EditionCrafter
                        documentName={resourceName}
                        transcriptionTypes={transcriptionTypes}
                        iiifManifest={iiifManifest}
                    /> }
                    { mode === 'reading' && <div id="reading-view"><Parser
                            html={html}
                            htmlToReactParserOptionsSide={htmlToReactParserOptionsSide}
                        /></div>
                    }
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
        fairCopy.ipcSend('openWebpage', target)
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
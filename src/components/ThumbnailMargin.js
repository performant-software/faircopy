import React, { Component } from 'react';

const marginTop = 125

export default class ThumbnailMargin extends Component {
    
    renderThumbnails() {
        const { teiDocument, scrollTop } = this.props
        const { editorView } = teiDocument

        const editorState = editorView.state

        const thumbnails = []
        editorState.doc.descendants( (node,pos) => {
            const imageURLs = this.findImageURLs(node)
            if( imageURLs ) {
                const startCoords = editorView.coordsAtPos(pos)
                const top = startCoords.top - marginTop + scrollTop
                const thumbStyle = { top }
                const thumbKey = `facs-thumb-${thumbnails.length}`
                const thumbSrc = imageURLs[0]
                if( thumbSrc ) {
                    thumbnails.push(
                        <img key={thumbKey} style={thumbStyle} className="facs-thumbnail" alt={thumbSrc} src={thumbSrc}></img>
                    )
                } 
            }
        })
    
        return thumbnails
    }

    // return an array of image urls or null 
    findImageURLs(node) {
        const { teiDocument } = this.props
        const { fairCopyProject } = teiDocument
        const { teiSchema, idMap } = fairCopyProject

        const uris = []
        const scanAttributes = (node) => {
            const element = teiSchema.elements[node.type.name]
            if(element) {
                for( const elAttr of element.validAttrs ) {
                    // we're looking for teipointer type attributes 
                    const attr = teiSchema.attrs[elAttr]
                    if( attr.dataType === 'teidata.pointer' ) {
                        const attrName = attr.ident
                        const attrValue = node.attrs[attrName]
                        if( attrValue ) {
                            uris.push( ...attrValue.split(' ') )
                        }
                    }
                }        
            }
        }

        // scan the node itself and all its marks for uris
        scanAttributes(node)
        for( const mark of node.marks ) {
            scanAttributes(mark)
        }

        // obtain the image URL for thumbnails
        const thumbURLs = []
        for( const uri of uris ) {
            const resource = idMap.get(uri)
            if( resource && resource.type === 'facs' ) {
                thumbURLs.push(resource.thumbnailURL)
            }
        }
        return thumbURLs.length > 0 ? thumbURLs : null   
    }

    render() {   
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        if( !editorView ) return null
        
        return (
            <div id="ThumbnailMargin">
                { this.renderThumbnails() }
            </div>
        )     
    }
}

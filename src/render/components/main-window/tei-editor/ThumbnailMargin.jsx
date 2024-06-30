import React, { Component } from 'react';

const fairCopy = window.fairCopy

export default class ThumbnailMargin extends Component {

    findTop(editorView,pos,attempt=0) {
        const startCoords = editorView.coordsAtPos(pos)
        // if this is a structure node w/no height, walk back to find the bottom of a node with height
        // give up after 3 attempts
        if( !startCoords.height && pos > 0 && attempt < 3) return this.findTop(editorView,pos-1,attempt+1)
        return pos === 0 ? 20 : startCoords.top - 85 + editorView.dom.parentNode.parentNode.scrollTop
    }
    
    renderThumbnails() {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        const editorState = editorView.state

        const thumbnails = []
        editorState.doc.descendants( (node,pos) => {
            const thumbResources = this.findImageURLs(node)
            if( thumbResources ) {
                const top = this.findTop(editorView,pos) 
                const thumbStyle = { top }
                const thumbKey = `facs-thumb-${thumbnails.length}`
                const thumbResource = thumbResources[0]
                if( thumbResource ) {
                    const { thumbnailURL, resourceID, xmlID } = thumbResource
                    const {parentEntry} = teiDocument
                    const imageViewData = { resourceID, xmlID, parentID: parentEntry?.id }
                    thumbnails.push(
                        <img 
                            onClick={() => { fairCopy.ipcSend('requestImageView', imageViewData) }} 
                            key={thumbKey} 
                            style={thumbStyle} 
                            className="facs-thumbnail" 
                            alt={thumbnailURL} 
                            src={thumbnailURL}
                        ></img>
                    )
                } 
            }
        })
    
        return thumbnails
    }

    // return an array of image urls or null 
    findImageURLs(node) {
        const { teiDocument } = this.props
        const { fairCopyProject, parentEntry } = teiDocument
        const { teiSchema, idMap } = fairCopyProject
        
        const uris = []
        const scanAttributes = (node) => {
            const element = teiSchema.elements[node.type.name]
            if(element && element.validAttrs ) {
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

        // obtain the resource data for thumbnails
        const thumbResources = []
        for( const uri of uris ) {
            const resource = idMap.get(uri, parentEntry?.localID)
            if( resource && resource.type === 'facs' ) {                
                thumbResources.push({ ...resource })
            }
        }
        return thumbResources.length > 0 ? thumbResources : null   
    }

    render() {   
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        if( !editorView ) return null
        const thumbnails = this.renderThumbnails()
        // skip in tab index if there are no thumbnails
        const tabIndex = thumbnails.length > 0 ? 0 : -1
        
        return (
            <div id="ThumbnailMargin" tabIndex={tabIndex}>
                { thumbnails }
            </div>
        )     
    }
}

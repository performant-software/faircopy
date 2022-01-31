import React, { Component } from 'react';

const fairCopy = window.fairCopy

export default class ThumbnailMargin extends Component {
    
    renderThumbnails() {
        const { teiDocument, marginTop } = this.props
        const { editorView } = teiDocument

        const editorState = editorView.state
        const scrollTop = editorView.dom.parentNode.parentNode.scrollTop

        const thumbnails = []
        editorState.doc.descendants( (node,pos) => {
            const thumbResources = this.findImageURLs(node)
            if( thumbResources ) {
                const startCoords = editorView.coordsAtPos(pos)
                const top = startCoords.top - marginTop + scrollTop
                const thumbStyle = { top }
                const thumbKey = `facs-thumb-${thumbnails.length}`
                const thumbResource = thumbResources[0]
                if( thumbResource ) {
                    const { thumbnailURL, resourceID, xmlID } = thumbResource
                    const parentEntry = teiDocument.getParent()
                    const imageViewData = { resourceID, xmlID, parentID: parentEntry?.id }
                    thumbnails.push(
                        <img 
                            onClick={() => { fairCopy.services.ipcSend('requestImageView', imageViewData) }} 
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
        const { fairCopyProject } = teiDocument
        const { teiSchema, idMap } = fairCopyProject
        const parentEntry = teiDocument.getParent()
        
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
                const resourceID = fairCopyProject.getResourceID( resource.localID )
                thumbResources.push({ ...resource, resourceID })
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

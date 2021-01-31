import React, { Component } from 'react'
import SurfaceEditor from './SurfaceEditor'
import FacsIndex from './FacsIndex'

const fairCopy = window.fairCopy

export default class FacsEditor extends Component {

    constructor(props) {
        super()
        
        const surfaceIndex = props.startIndex ? props.startIndex : 0
        const mode = isNaN(props.startIndex) ? 'index' : 'detail'

        this.state = {
            mode,
            surfaceIndex
        }
    }

    getFacsDocument() {
        if( this.props.imageView ) {
            const { imageView } = this.props
            return imageView.facsDocument
        } else {
            return this.props.facsDocument
        }
    }

    onWindow = () => {
        const facsDocument = this.getFacsDocument() 
        const { surfaceIndex } = this.state
        const surface = facsDocument.getSurface(surfaceIndex)
        fairCopy.services.ipcSend('requestImageView', { resourceID: facsDocument.resourceID, xmlID: surface.id }) 
    }

    render() {
        const { hidden, resourceEntry, onEditResource, onAddImages, onOpenPopupMenu, onConfirmDeleteImages, onEditSurfaceInfo, windowed } = this.props
        const { mode, surfaceIndex } = this.state
        const facsDocument = this.getFacsDocument()

        if( hidden ) return null

        const onChangeView = (nextIndex,nextMode) => { this.setState({...this.state, mode: nextMode, surfaceIndex: nextIndex })}
        const onWindowPopup = !windowed ? this.onWindow : null 

        return (
            <div id="FacsEditor">
                { mode === 'detail' ? 
                    <SurfaceEditor
                        surfaceIndex={surfaceIndex}
                        facsDocument={facsDocument}
                        resourceEntry={resourceEntry}
                        onChangeView={onChangeView}
                        onEditSurfaceInfo={onEditSurfaceInfo}
                        onWindow={onWindowPopup}
                    ></SurfaceEditor>                
                : 
                    <FacsIndex
                        surfaceIndex={surfaceIndex}
                        facsDocument={facsDocument}
                        resourceEntry={resourceEntry}
                        onChangeView={onChangeView}
                        onEditResource={onEditResource}
                        onOpenPopupMenu={onOpenPopupMenu}   
                        onAddImages={onAddImages}         
                        onConfirmDeleteImages={onConfirmDeleteImages}  
                        onWindow={onWindowPopup}
                    ></FacsIndex>
                }
            </div>
        )
    }
}
import React, { Component } from 'react'
import SurfaceEditor from './SurfaceEditor'
import FacsIndex from './FacsIndex'

export default class FacsEditor extends Component {

    constructor(props) {
        super()
        
        let facsDocument = props.facsDocument ? props.facsDocument : null
        let startIndex = 0
        let mode='index'

        if( props.imageView ) {
            const { imageView } = props
            facsDocument = imageView.facsDocument
            const { surfaces } = facsDocument.facs
            startIndex = surfaces.findIndex( s => s.id === imageView.startingID )
            startIndex = startIndex === -1 ? 0 : startIndex
            mode='imageView'
        } 

        this.state = {
            mode,
            surfaceIndex: startIndex
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

    render() {
        const { hidden, resourceName, onEditResource, onAddImages, onOpenPopupMenu, onConfirmDeleteImages } = this.props
        const { mode, surfaceIndex } = this.state
        const facsDocument = this.getFacsDocument()

        if( hidden ) return null

        const onChangeView = (nextIndex,nextMode) => { this.setState({...this.state, mode: nextMode, surfaceIndex: nextIndex })}

        return (
            <div id="FacsEditor">
                { mode === 'detail' ? 
                    <SurfaceEditor
                        surfaceIndex={surfaceIndex}
                        facsDocument={facsDocument}
                        resourceName={resourceName}
                        onChangeView={onChangeView}
                    ></SurfaceEditor>                
                : 
                    <FacsIndex
                        surfaceIndex={surfaceIndex}
                        facsDocument={facsDocument}
                        resourceName={resourceName}
                        onChangeView={onChangeView}
                        onEditResource={onEditResource}
                        onOpenPopupMenu={onOpenPopupMenu}   
                        onAddImages={onAddImages}         
                        onConfirmDeleteImages={onConfirmDeleteImages}  
                    ></FacsIndex>
                }
            </div>
        )
    }
}
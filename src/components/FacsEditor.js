import React, { Component } from 'react'
import SurfaceEditor from './SurfaceEditor'
import FacsIndex from './FacsIndex'

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
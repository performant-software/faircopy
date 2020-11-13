import React, { Component } from 'react'
import FacsDetail from './FacsDetail'
import FacsIndex from './FacsIndex'

export default class FacsEditor extends Component {

    constructor(props) {
        super()
        
        let facsDocument = props.facsDocument ? props.facsDocument : null
        let startIndex = 0

        if( props.imageView ) {
            const { imageView } = props
            facsDocument = imageView.facsDocument
            const { surfaces } = facsDocument.facs
            startIndex = surfaces.findIndex( s => s.id === imageView.startingID )
            startIndex = startIndex === -1 ? 0 : startIndex
        } 

        this.state = {
            mode: 'index',
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
        const { hidden, fairCopyProject, onEditResource } = this.props
        const { mode, surfaceIndex } = this.state
        const facsDocument = this.getFacsDocument()

        if( hidden ) return null

        const onChangeMode = (nextMode) => { this.setState({...this.state, mode: nextMode })}
        const onChangeIndex = (nextIndex) => { this.setState({...this.state, surfaceIndex: nextIndex })}

        return (
            <div id="FacsEditor">
                { mode === 'detail' ? 
                    <FacsDetail
                        surfaceIndex={surfaceIndex}
                        facsDocument={facsDocument}
                        fairCopyProject={fairCopyProject}
                        onChangeMode={onChangeMode}
                        onChangeIndex={onChangeIndex}
                    ></FacsDetail>                
                : 
                    <FacsIndex
                        surfaceIndex={surfaceIndex}
                        facsDocument={facsDocument}
                        fairCopyProject={fairCopyProject}
                        onEditResource={onEditResource}                 
                        onChangeMode={onChangeMode}
                        onChangeIndex={onChangeIndex}
                    ></FacsIndex>
                }
            </div>
        )
    }
}
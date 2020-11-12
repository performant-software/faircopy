import React, { Component } from 'react'
import FacsDetail from './FacsDetail'
import FacsIndex from './FacsIndex'

export default class FacsEditor extends Component {

    constructor() {
        super()

        this.state = {
            mode: 'index'
        }
    }

    render() {
        const { hidden, facsDocument, fairCopyProject, onEditResource } = this.props
        const { mode } = this.state

        const style = hidden ? { display: 'none' } : {}

        if( hidden ) return

        const onChangeMode = (nextMode) => { this.setState({...this.state, mode: nextMode })}

        return (
            <div id="FacsEditor" style={style} >
                { mode === 'detail' ? 
                    <FacsDetail
                        facsDocument={facsDocument}
                        fairCopyProject={fairCopyProject}
                        onEditResource={onEditResource}                 
                        onChangeMode={onChangeMode}
                    ></FacsDetail>                
                : 
                    <FacsIndex
                        facsDocument={facsDocument}
                        fairCopyProject={fairCopyProject}
                        onEditResource={onEditResource}                 
                        onChangeMode={onChangeMode}
                    ></FacsIndex>
                }
            </div>
        )
    }
}
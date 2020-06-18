import React, { Component } from 'react'

import FacsEditor from './FacsEditor'

const fairCopy = window.fairCopy

export default class ImageWindow extends Component {

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('fileSaved', (event, resourceID) => this.saved(resourceID))
    }
    
    saved(resourceID) {
        // TODO
        // this.setState( { ...this.state, 
        //     alertDialogMode: false, 
        //     exitAnyway: false
        // })
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,latest:nextState})
    }

    render() {
        const { imageView } = this.props

        if(!imageView) return null

        return (
            <FacsEditor
                imageView={imageView}
            ></FacsEditor>
        )
    }

}

import React, { Component } from 'react'

import FacsEditor from './FacsEditor'

const fairCopy = window.fairCopy

export default class ImageWindow extends Component {

    onStateChange = (nextState) => {
        this.setState({...this.state,latest:nextState})
    }

    onEditResource = () => {
        // TODO
    }

    onAddImages = () => {
        // TODO
    }

    onOpenPopupMenu = () => {
        // TODO
    }

    onConfirmDeleteImages = () => {
        // TODO
    }

    render() {
        const { imageView } = this.props

        if(!imageView) return null

        const resourceName = imageView.resourceEntry.name

        return (
            <FacsEditor
                resourceName={resourceName}
                facsDocument={imageView.facsDocument}
                onEditResource={this.onEditResource}    
                onAddImages={this.onAddImages}
                onOpenPopupMenu={this.onOpenPopupMenu}
                onConfirmDeleteImages={this.onConfirmDeleteImages}
            ></FacsEditor>
        )
    }

}

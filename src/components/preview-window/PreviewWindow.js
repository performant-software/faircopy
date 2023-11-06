import React, { Component } from 'react'

const fairCopy = window.fairCopy

export default class PreviewWindow extends Component {

    constructor() {
        super()
        this.state = {
            resourceEntry: null,
            teiDocXML: null
        }	
    }

    onResourceUpdated = (e, resourceData) => {
        const { resourceEntry, teiDocXML } = resourceData
        this.setState({ ...this.state, resourceEntry, teiDocXML })
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('resourceUpdated', this.onResourceUpdated )
    }
    
    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('resourceUpdated', this.onResourceUpdated )
    }

    renderSpinner() {
        return (
            <div id="PreviewWindow">
                <h1>Loading...</h1>
            </div>
        )
    }

    render() {
        const { resourceEntry, teiDocXML } = this.state
        if(!resourceEntry || !teiDocXML ) return this.renderSpinner()

        return (
            <div id="PreviewWindow">
                <h1>Document {resourceEntry.name}</h1>
                <div>{ teiDocXML }</div>
            </div>
        )
    }

}

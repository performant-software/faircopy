import { Typography } from '@material-ui/core'
import React, { Component } from 'react'


export default class ElementLibrary extends Component {

    renderElement(elementID) {
        const key = `element-${elementID}`
        return (
            <div className="element-item" key={key}>
                <Typography>{elementID}</Typography>
            </div>
        )
    }

    renderModule(moduleID) {
        const { modules } = this.props.teiSchema
        const module = modules[moduleID]

        const elements = []
        for( const elementID of module ) {
            elements.push( this.renderElement(elementID) )
        }

        return (
            <div className="module">
                <Typography>{moduleID}</Typography>
                <div className="elements">
                    { elements }
                </div>
            </div>
        )
    }

    render() {
        const { modules } = this.props.teiSchema

        const moduleEls = []
        for( const moduleID of Object.keys(modules) ) {
            moduleEls.push( this.renderModule(moduleID) )
        }

        return (
            <div id="ElementLibrary">
                <Typography>TEI Elements</Typography>
                <div className="modules">
                    { moduleEls }
                </div>
            </div>
        )
    }
}
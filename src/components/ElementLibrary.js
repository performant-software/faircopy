import { Typography } from '@material-ui/core'
import React, { Component } from 'react'


export default class ElementLibrary extends Component {

    getElementType(elementID) {
        const { elementGroups } = this.props.teiSchema

        for( const groupID of Object.keys(elementGroups) ) {
            if( elementGroups[groupID].includes(elementID) ) {
                return groupID
            }
        }
        return 'notype'
    }

    renderElement(elementID) {
        const elementType = this.getElementType(elementID)        
        const key = `element-${elementID}`
        return (
            <div className={`element-item ${elementType}`} key={key}>
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
            <div key={`module-${moduleID}`} className="module">
                <Typography>{moduleID}</Typography>
                <div className="elements">
                    { elements }
                </div>
            </div>
        )
    }

    render() {
        const { modules } = this.props.teiSchema
        const moduleIDs = Object.keys(modules).sort()

        const moduleEls = []
        for( const moduleID of moduleIDs ) {
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
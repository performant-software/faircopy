import { Typography } from '@material-ui/core'
import React, { Component } from 'react'

const menusToElementTypes = {
    structure: ['hard','soft','inter'],
    mark: ['marks','limited-marks','inter'],
    inline: ['inlines','asides']
}

export default class ElementLibrary extends Component {

    renderElement(elementID,elementType) {
        const key = `element-${elementID}`
        return (
            <div className={`element-item ${elementType}`} key={key}>
                <Typography>{elementID}</Typography>
            </div>
        )
    }
    
    renderModule(moduleID) {
        const { teiSchema, selectedMenu } = this.props
        const { modules } = teiSchema
        const module = modules[moduleID]

        const elements = []
        for( const elementID of module ) {
            const elementType = teiSchema.getElementType(elementID)
            if( menusToElementTypes[selectedMenu].includes(elementType) ) {
                elements.push( this.renderElement(elementID,elementType) )
            }    
        }

        if( elements.length === 0 ) return null

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
            const module = this.renderModule(moduleID)
            if( module ) {
                moduleEls.push(module)
            }
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
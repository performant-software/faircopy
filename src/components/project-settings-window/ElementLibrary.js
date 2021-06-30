import { Typography } from '@material-ui/core'
import React, { Component } from 'react'

const menusToElementTypes = {
    structure: ['hard','soft','inter'],
    mark: ['marks','limited-marks','inter'],
    inline: ['inlines','asides']
}

const clientOffset = { x: 200, y: 65 }

export default class ElementLibrary extends Component {

    renderElement(elementID,elementType) {
        const { teiSchema, onSelect, onDragElement } = this.props
        const key = `element-${elementID}`
        const icon = teiSchema.getElementIcon(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null

        const onClick = () => { onSelect(elementID) }

        const onStartDrag = (e) => {
            const startingPoint = { x: e.clientX-clientOffset.x, y: e.clientY-clientOffset.y }
            onDragElement(elementID,clientOffset,startingPoint,-1)
        }

        return (
            <div onMouseDown={onStartDrag} onClick={onClick} className={`element-item ${elementType} library-element`} key={key}>
                <Typography>{elementIcon}{elementID}</Typography>
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
                <Typography><b>{moduleID}</b></Typography>
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
                <div className="header">
                    <Typography variant="h5" >TEI Elements</Typography>
                </div>
                <div className="modules">
                    { moduleEls }
                </div>
            </div>
        )
    }
}
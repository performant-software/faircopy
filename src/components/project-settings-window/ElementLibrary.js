import { Typography } from '@material-ui/core'
import React, { Component } from 'react'

const clientOffset = { x: 200, y: 65 }

export default class ElementLibrary extends Component {

    renderElement(elementID) {
        const { teiSchema, onSelect, onDragElement } = this.props
        const key = `element-${elementID}`
        const icon = teiSchema.getElementIcon(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null

        const onClick = () => { onSelect(elementID,null) }

        const onStartDrag = (e) => {
            const startingPoint = { x: e.clientX-clientOffset.x, y: e.clientY-clientOffset.y }
            onDragElement(elementID,clientOffset,startingPoint,-1)
        }

        return (
            <div onMouseDown={onStartDrag} onClick={onClick} className={`element-item library-element`} key={key}>
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
            const elementMenu = teiSchema.getElementMenu(elementID)
            if( elementMenu === selectedMenu ) {
                elements.push( this.renderElement(elementID) )
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
                    <Typography>Drag elements from here to customize the editor menus.</Typography>
                </div>
                <div className="modules">
                    { moduleEls }
                </div>
            </div>
        )
    }
}
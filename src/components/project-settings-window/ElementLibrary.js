import { Typography } from '@material-ui/core'
import React, { Component } from 'react'
import { Droppable, Draggable } from "react-beautiful-dnd"

import { getElementIcon } from '../../model/TEISchema'

export default class ElementLibrary extends Component {

    renderElement(elementID,index) {
        const { teiSchema, selectedElement, readOnly } = this.props
        const key = `element-${elementID}`
        const icon = getElementIcon(elementID, teiSchema.elements)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null
        const selected = ( elementID === selectedElement ) ? "selected-item" : ""

        const elementEl = (
            <div key={key} className={`element-item library-element ${selected}`} >
                <Typography>{elementIcon}{elementID}</Typography>
            </div>                        
        )

        return (
            readOnly ? 
                // can't drag in readonly mode
                elementEl
            :            
                <Draggable key={`drag-${key}`} draggableId={key} index={index}>
                    { (provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                        >
                            { elementEl }
                        </div>
                    )}
                </Draggable>
        )
    }
    
    renderModule(moduleID) {
        const { teiSchema, selectedMenu } = this.props
        const { modules } = teiSchema
        const module = modules[moduleID].filter( (elementID) => teiSchema.validElementMenu(selectedMenu,elementID))

        if( module.length === 0 ) return null

        return (
            <div key={`module-${moduleID}`} className="module">
                <Typography><b>{moduleID}</b></Typography>
                <Droppable droppableId={`module-members-${moduleID}`} type="members" isDropDisabled={true}>
                    { (provided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            <div className="elements">
                                { module.map( (elementID,index) => {
                                    return this.renderElement(elementID,index)
                                })}
                                {provided.placeholder}
                            </div>
                        </div>
                    )}
                </Droppable>
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
                    <Typography variant="h5" component="h2" >TEI Elements</Typography>
                    <Typography>Drag elements from here to customize the editor menus.</Typography>
                </div>
                <div className="modules">
                    { moduleEls }
                </div>
            </div>
        )
    }
}
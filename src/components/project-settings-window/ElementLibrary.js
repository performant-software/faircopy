import { Typography } from '@material-ui/core'
import React, { Component } from 'react'
import { Droppable, Draggable } from "react-beautiful-dnd"

export default class ElementLibrary extends Component {

    renderElement(elementID,index) {
        const { teiSchema, selectedElement } = this.props
        const key = `element-${elementID}`
        const icon = teiSchema.getElementIcon(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null
        const selected = ( elementID === selectedElement ) ? "selected-item" : ""

        return (
            <Draggable key={key} draggableId={key} index={index}>
                { (provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                    >
                        <div className={`element-item library-element ${selected}`} >
                            <Typography>{elementIcon}{elementID}</Typography>
                        </div>                        
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
import React, { Component } from 'react'

import { Typography, Tabs, Tab, Collapse, Tooltip, Divider, AccordionActions, Button, IconButton } from '@material-ui/core'
import { Accordion, AccordionDetails, AccordionSummary } from '@material-ui/core'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { removeGroupFromMenu } from '../../model/faircopy-config'

const clientOffset = { x: 200, y: 65 }

export default class ElementTree extends Component {

    constructor(props) {
        super(props)

        this.state = {
            accordionStates: { 'structure': [], 'mark': [], 'inline': []}
        }
    }


    renderElement(groupID,elementID) {
        const { teiSchema, onSelect, onDragElement, draggedAwayElementID } = this.props
        const icon = teiSchema.getElementIcon(elementID)
        const elementType = teiSchema.getElementType(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null

        const onClick = () => { onSelect(elementID,groupID) }

        const onStartDrag = (e) => {
            const startingPoint = { x: e.clientX-clientOffset.x, y: e.clientY-clientOffset.y }
            onDragElement(elementID,clientOffset,startingPoint,groupID)
        }

        // if this element has been dragged away, collapse it
        const collapsed = (draggedAwayElementID !== elementID)

        return (
            <Collapse key={`tree-element-${elementID}`} in={collapsed}>
                <div onMouseDown={onStartDrag} onClick={onClick} className={`element-item ${elementType}`} >
                    <Typography>{elementIcon}{elementID}</Typography>
                </div>
            </Collapse>
        )
    }

    renderDropZone( elementID, groupID, paletteOrder ) {
        const { selectedMenu, hoverOverElementID } = this.props
        const collapsed = (hoverOverElementID === elementID)
        return (
            <Collapse 
                in={collapsed}
                className="drop-zone"
                key={`drop-zone-${elementID}`} 
                collapsedHeight={10}
                dataelementid={elementID}
                datamenuid={selectedMenu}
                datamenugroupid={groupID}
                datapalettepos={paletteOrder}
        >
                <div 
                    className={`landing-pad ${ collapsed ? 'hover-over' : ''}`}                    
                ></div>
            </Collapse>
        )
    }

    closeAllAccordions() {
        const { selectedMenu } = this.props
        const { accordionStates } = this.state
        const nextAccordionStates = { ...accordionStates }
        nextAccordionStates[selectedMenu] = []
        this.setState( { ...this.state, accordionStates: nextAccordionStates })
    }

    getAccordionState(groupIndex) {
        const { selectedMenu } = this.props
        const { accordionStates } = this.state
        return accordionStates[selectedMenu][groupIndex] === true
    }

    createAccordionCallback(groupIndex) {
        const { selectedMenu } = this.props

        return (e,expanded) => {
            const { accordionStates } = this.state
            const nextGroup = [ ...accordionStates[selectedMenu] ]
            nextGroup[groupIndex] = expanded
            const nextAccordionStates = { ...accordionStates }
            nextAccordionStates[selectedMenu] = nextGroup
            this.setState( { ...this.state, accordionStates: nextAccordionStates })
        }
    }

    renderGroup(elementGroup,groupIndex,oneLeft) {
        const { onEditGroup, fairCopyConfig, selectedMenu, onUpdateConfig } = this.props

        const members = []
        let i=0
        for( const member of elementGroup.members ) {
            const memberItem = this.renderElement(groupIndex,member)
            const dropZone = this.renderDropZone(member,groupIndex,i++)
            members.push(dropZone)
            members.push(memberItem)
        }
        const dropZone = this.renderDropZone('--PLACEHOLDER--',groupIndex,i)
        members.push(dropZone)

        const onEditName = () => { onEditGroup( groupIndex ) }
        const onDelete = () => {
            removeGroupFromMenu( groupIndex, selectedMenu, fairCopyConfig)
            this.closeAllAccordions()
            onUpdateConfig(fairCopyConfig)
        }

        const groupID = `${groupIndex}`
        return (
            <Accordion key={groupID}
                expanded={this.getAccordionState(groupID)} 
                onChange={this.createAccordionCallback(groupID)}            
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel2a-content"
                    id="panel2a-header"
                >
                    <Typography>
                        <Tooltip title="Grab a row to move it."><i className="grab-handle fa fa-sm fa-grip-horizontal"></i></Tooltip>
                        {elementGroup.label}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div>
                        { members }
                    </div>
                </AccordionDetails>
                <Divider />
                <AccordionActions>
                    <Tooltip title="Edit the name of this group."><IconButton onClick={onEditName}><i className="fas fa-edit fa-sm"></i></IconButton></Tooltip>
                    <Tooltip title="Delete this group."><span><IconButton disabled={oneLeft} onClick={onDelete}><i className="fas fa-trash fa-sm"></i></IconButton></span></Tooltip>                    
                </AccordionActions>
            </Accordion>
        )
    }

    renderTree() {
        const { fairCopyConfig, selectedMenu, onEditGroup, onUpdateConfig } = this.props
        const elementGroups = fairCopyConfig.menus[selectedMenu]

        const onAddGroup = () => {
            onEditGroup( -1 )
        }

        const onDragEnd = (result) => {
            // dropped outside the list
            if (!result.destination) return
        
            const nextElementGroups = reorder(
                elementGroups,
                result.source.index,
                result.destination.index
            )
            
            fairCopyConfig.menus[selectedMenu] = nextElementGroups
            onUpdateConfig(fairCopyConfig)
        }

        return (
            <div>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="element-tree">
                        { (provided) => (
                            <div 
                                className="tree-view"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                { elementGroups.map( (elementGroup,i) => {
                                    const groupID = `elementGroup-${i}`
                                    return (
                                        <Draggable key={groupID} draggableId={groupID} index={i}>
                                            { (provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    { this.renderGroup(elementGroup,i,elementGroups.length === 1) }
                                                </div>
                                            )}
                                        </Draggable>
                                    )
                                })}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
                <Button 
                    onClick={onAddGroup} 
                    className="add-group-button" 
                    variant="outlined" 
                    key="add-group-button"
                >
                    <i className="fas fa-plus fa-sm"></i> Add Group
                </Button>
            </div>
        )
    }

    render() {
        const { selectedMenu, onChangeMenu } = this.props

        const structureLabel = <span><i className="fas fa-palette"></i> Structures</span>
        const markLabel = <span><i className="fas fa-marker"></i> Marks</span>
        const inlineLabel = <span><i className="fas fa-stamp"></i> Inlines</span>

        return (
            <div id="ElementTree">
                <div className="header">
                    <Tabs value={selectedMenu} onChange={onChangeMenu}>
                        <Tab value="structure" label={structureLabel} />
                        <Tab value="mark" label={markLabel}/>
                        <Tab value="inline" label={inlineLabel}/>
                    </Tabs>
                </div>
                { this.renderTree(selectedMenu) }
            </div>
        )
    }
}

// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
  
    return result;
}
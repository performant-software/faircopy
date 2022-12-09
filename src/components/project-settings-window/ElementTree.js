import React, { Component } from 'react'
import { Typography, Tabs, Tab, Tooltip, Divider, AccordionActions, Button, IconButton } from '@material-ui/core'
import { Accordion, AccordionDetails, AccordionSummary } from '@material-ui/core'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Droppable, Draggable } from "react-beautiful-dnd"

import ElementInfoPopup from '../main-window/tei-editor/ElementInfoPopup';
import { removeGroupFromMenu } from '../../model/faircopy-config'
import { determineRules } from '../../model/editor-actions'

export default class ElementTree extends Component {

    constructor(props) {
        super(props)

        this.state = {
            accordionStates: { 'structure': {}, 'mark': {}, 'inline': {}},
            elementInfoID: null
        }
        this.itemEls = {}
    }

    renderElementInfo() {
        const { teiSchema, selectedMenu } = this.props
        const { elementInfoID } = this.state
        const anchorEl = this.itemEls[elementInfoID]

        if( !elementInfoID || !anchorEl ) return null

        const { elements } = teiSchema
        const elementSpec = elements[elementInfoID]

        if(!elementSpec) return null
        
        if( selectedMenu === 'structure' ) {
            const rules = determineRules( elementInfoID, teiSchema )

            return (
                <ElementInfoPopup
                    elementSpec={elementSpec}
                    containedBy={rules.containedBy}
                    mayContain={rules.mayContain}
                    notes={rules.notes}
                    anchorEl={()=>{ return this.itemEls[elementInfoID]}}    
                ></ElementInfoPopup>
            )    
        } else {
            return (
                <ElementInfoPopup
                    elementSpec={elementSpec}
                    anchorEl={()=>{ return this.itemEls[elementInfoID]}}    
                ></ElementInfoPopup>
            )    
        }
    }

    renderElement(groupID,elementID,index) {
        const { teiSchema, onSelect, selectedElement, selectedGroup, readOnly } = this.props
        const icon = teiSchema.getElementIcon(elementID)
        const elementType = teiSchema.getElementType(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null
        const elementKey = `group${groupID}_element-${elementID}`
        const selected = ( groupID === selectedGroup && elementID === selectedElement ) ? "selected-item" : ""

        const setItemElRef = (el) => {
            this.itemEls[elementID] = el
        }
        const onClick = () => { if(!readOnly ) onSelect(elementID,groupID) }
        const onMouseOver = () => { this.setState({ ...this.state, elementInfoID: elementID })}
        const onMouseLeave = () => { this.setState({ ...this.state, elementInfoID: null })}

        const elementEl = (
            <div key={elementKey} ref={setItemElRef} onClick={onClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} className={`element-item ${elementType} ${selected}`} >
                <Typography>{elementIcon}{elementID}</Typography>
            </div>                        
        )

        return (
            readOnly ? 
                elementEl                
            :
                <Draggable key={`drag-${elementKey}`} draggableId={elementKey} index={index}>
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

    closeAllAccordions() {
        const { selectedMenu } = this.props
        const { accordionStates } = this.state
        const nextAccordionStates = { ...accordionStates }
        nextAccordionStates[selectedMenu] = {}
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
            const nextGroup = { ...accordionStates[selectedMenu] }
            nextGroup[groupIndex] = expanded
            const nextAccordionStates = { ...accordionStates }
            nextAccordionStates[selectedMenu] = nextGroup
            this.setState( { ...this.state, accordionStates: nextAccordionStates })
        }
    }

    renderGroup(elementGroup,groupIndex,oneLeft) {
        const { onEditGroup, fairCopyConfig, selectedMenu, onUpdateConfig, readOnly } = this.props

        const onEditName = () => { onEditGroup( groupIndex ) }
        const onDelete = () => {
            removeGroupFromMenu( groupIndex, selectedMenu, fairCopyConfig)
            this.closeAllAccordions()
            onUpdateConfig(fairCopyConfig)
        }

        const groupKey = `acc-${groupIndex}`
        const expanded = this.getAccordionState(groupKey)
        return (
            <Accordion key={groupKey}
                expanded={expanded} 
                onChange={this.createAccordionCallback(groupKey)}                
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}                >
                    <Typography>
                        { !readOnly && <Tooltip title="Grab a row to move it."><i className="grab-handle fa fa-sm fa-grip-horizontal"></i></Tooltip> }
                        {elementGroup.label}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    { expanded && 
                        <Droppable droppableId={`group-${groupIndex}`} type="members">
                            { (provided) => (
                                <div className="drop-zone"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    { elementGroup.members.map( (member,index) => this.renderElement(groupIndex,member,index)) }
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    }
                </AccordionDetails>
                <Divider />
                { !readOnly && 
                    <AccordionActions>
                        <Tooltip title="Edit the name of this group."><IconButton onClick={onEditName}><i className="fas fa-edit fa-sm"></i></IconButton></Tooltip>
                        <Tooltip title="Delete this group."><span><IconButton disabled={oneLeft} onClick={onDelete}><i className="fas fa-trash fa-sm"></i></IconButton></span></Tooltip>                    
                    </AccordionActions>        
                }
            </Accordion>
        )
    }

    renderTree() {
        const { fairCopyConfig, selectedMenu, onEditGroup, readOnly } = this.props
        const elementGroups = fairCopyConfig.menus[selectedMenu]

        const onAddGroup = () => {
            onEditGroup( -1 )
        }

        return (
            <div>
                <Droppable droppableId="element-tree" type="groups">
                    { (provided) => (
                        <div 
                            className="tree-view"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            { elementGroups.map( (elementGroup,i) => {
                                const groupID = `elementGroup-${i}`
                                const onlyOne = elementGroups.length === 1
                                return (
                                    readOnly ? 
                                        // readOnly group is not draggable
                                        this.renderGroup(elementGroup,i,onlyOne)                                                                            
                                    :                                     
                                        <Draggable key={groupID} draggableId={groupID} index={i}>
                                            { (provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                >
                                                    { this.renderGroup(elementGroup,i,onlyOne) }
                                                </div>
                                            )}
                                        </Draggable>
                                )
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
                { !readOnly &&
                    <Button 
                        onClick={onAddGroup} 
                        className="add-group-button" 
                        variant="outlined" 
                        key="add-group-button"
                    >
                        <i className="fas fa-plus fa-sm"></i> Add Group
                    </Button>                
                }
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
                { this.renderElementInfo() } 
            </div>
        )
    }
}
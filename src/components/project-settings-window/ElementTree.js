import React, { Component } from 'react'

import { Typography, Tabs, Tab, Collapse } from '@material-ui/core'
import { Accordion, AccordionDetails, AccordionSummary } from '@material-ui/core'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const clientOffset = { x: 200, y: 65 }

export default class ElementTree extends Component {

    renderElement(elementID) {
        const { teiSchema, onSelect, onDragElement, draggedAwayElementID } = this.props
        const icon = teiSchema.getElementIcon(elementID)
        const elementType = teiSchema.getElementType(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null

        const onClick = () => { onSelect(elementID) }

        const onStartDrag = (e) => {
            const startingPoint = { x: e.clientX-clientOffset.x, y: e.clientY-clientOffset.y }
            onDragElement(elementID,clientOffset,startingPoint)
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

    renderGroup(elementGroup,groupIndex) {
        const members = []
        for( const member of elementGroup.members ) {
            const memberItem = this.renderElement(member)
            members.push(memberItem)
        }

        const groupID = `${groupIndex}`
        return (
            <Accordion key={groupID} >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel2a-content"
                    id="panel2a-header"
                >
                    <Typography>{elementGroup.label}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div>
                        { members }
                    </div>
                </AccordionDetails>
            </Accordion>
        )
    }

    renderTree() {
        const { fairCopyConfig, selectedMenu } = this.props
        const elementGroups = fairCopyConfig.menus[selectedMenu]

        const groups = []
        let i=0
        for( const elementGroup of elementGroups ) {
            const group = this.renderGroup(elementGroup,i++)
            groups.push(group)
        }

        return (
            <div className="tree-view">
                { groups }
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

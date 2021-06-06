import React, { Component } from 'react'

import { Typography, Tabs, Tab } from '@material-ui/core'
import { TreeView, TreeItem } from '@material-ui/lab'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

export default class ElementTree extends Component {

    renderElement(elementID) {
        const { teiSchema } = this.props
        const icon = teiSchema.getElementIcon(elementID)
        const elementType = teiSchema.getElementType(elementID)
        const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null

        return (
            <div className={`element-item ${elementType}`} >
                <Typography>{elementIcon}{elementID}</Typography>
            </div>
        )
    }

    renderGroup(elementGroup,groupIndex) {
        const { onSelect, onDragElement } = this.props
        const members = []
        let i=0
        for( const member of elementGroup.members ) {
            const nodeId = `${groupIndex}.${i++}`
            const onClick = () => { onSelect(member) }

            const onStartDrag = (e) => {
                const x = e.clientX
                const y = e.clientY
                onDragElement(member,{x, y})
            }
        
            const label = this.renderElement(member) 
            const memberItem = <TreeItem onMouseDown={onStartDrag} key={nodeId} nodeId={nodeId} label={label} onLabelClick={onClick}></TreeItem>
            members.push(memberItem)
        }
        const groupID = `${groupIndex}`
        return (
            <TreeItem key={groupID} nodeId={groupID} label={elementGroup.label}>
                { members }
            </TreeItem>
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
            <TreeView className="tree-view"
                defaultCollapseIcon={<ExpandMoreIcon />}
                defaultExpandIcon={<ChevronRightIcon />}
                >
                { groups }
            </TreeView>
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

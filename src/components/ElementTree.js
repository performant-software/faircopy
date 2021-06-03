import React, { Component } from 'react'

import { Typography } from '@material-ui/core'
import { TreeView, TreeItem } from '@material-ui/lab'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

export default class ElementTree extends Component {

    renderGroup(elementGroup,groupIndex) {
        const { onSelect, teiSchema } = this.props
        const members = []
        let i=0
        for( const member of elementGroup.members ) {
            const nodeId = `${groupIndex}.${i++}`
            const onClick = () => { onSelect(member) }
            const elementType = teiSchema.getElementType(member)
            const label =  <div className={`element-item ${elementType}`}><Typography>{member}</Typography></div>
            const memberItem = <TreeItem key={nodeId} nodeId={nodeId} label={label} onLabelClick={onClick}></TreeItem>
            members.push(memberItem)
        }
        const groupID = `${groupIndex}`
        return (
            <TreeItem key={groupID} nodeId={groupID} label={elementGroup.label}>
                { members }
            </TreeItem>
        )
    }

    render() {
        const { elementGroups } = this.props

        const groups = []
        let i=0
        for( const elementGroup of elementGroups ) {
            const group = this.renderGroup(elementGroup,i++)
            groups.push(group)
        }

        return (
            <div id="ElementTree">
                <TreeView
                    defaultCollapseIcon={<ExpandMoreIcon />}
                    defaultExpandIcon={<ChevronRightIcon />}
                    >
                    { groups }
                </TreeView>
            </div>
        )
    }
}

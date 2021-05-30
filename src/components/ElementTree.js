import React, { Component } from 'react'

import { TreeView, TreeItem } from '@material-ui/lab'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

export default class ElementTree extends Component {

    renderGroup(elementGroup,groupIndex) {
        const members = []
        let i=0
        for( const member of elementGroup.members ) {
            const nodeId = `${groupIndex}.${i++}`
            const memberItem = <TreeItem nodeId={nodeId} label={member}></TreeItem>
            members.push(memberItem)
        }

        return (
            <TreeItem nodeId={groupIndex} label={elementGroup.label}>
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

import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
import { Typography } from '@material-ui/core';

export default class ProjectNavigator extends Component {

    onClickNode = () => {

    }

    renderTree() {
      const { fairCopyProject } = this.props
      const { resources, projectName } = fairCopyProject
 
      const treeNodes = []
      for( const resource of Object.values(resources) ) {
        const treeID = `nav-node-${resource.id}`
        const label = <Typography>{resource.id}</Typography>
        treeNodes.push(
          <TreeItem 
            onClick={this.onClickNode}
            key={treeID} 
            nodeId={treeID} 
            label={label} >
          </TreeItem>
        )
      }

      const projectLabel = <Typography>{projectName}</Typography>
      return (
        <TreeItem nodeId="root" label={projectLabel} >
          { treeNodes }
        </TreeItem>
      )
    }

    render() {
        return (
          <div id="ProjectNavigator">
            <TreeView
              defaultExpanded={["root"]}
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
            >
              { this.renderTree() }
            </TreeView>
          </div>
        )
    }

}

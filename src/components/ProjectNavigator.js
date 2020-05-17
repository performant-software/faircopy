import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
import { Button, Typography } from '@material-ui/core';

export default class ProjectNavigator extends Component {

    onClickNode = (e,resourceID) => {
      if( resourceID === 'root' ) return
      const { onSelectResource } = this.props
      onSelectResource(resourceID)
    }

    renderTreeRootLabel() {
      return (
        <div>
          <Typography className="tree-item-name">Open Resources</Typography>
          <Button className="tree-item-close">
            <i className="fa fa-plus-circle fa-lg"></i>
          </Button>
        </div>
      )    
    }

    renderTreeItemLabel(resource) {
      return (
        <div>
          <Typography className="tree-item-name">{resource.id}</Typography>
          <Button className="tree-item-close">
            <i className="fa fa-minus-circle fa-lg"></i>
          </Button>
        </div>
      )
    }

    renderTree() {
      const { fairCopyProject } = this.props
      const { resources } = fairCopyProject
 
      const treeNodes = []
      for( const resource of Object.values(resources) ) {
        const treeID = `nav-node-${resource.id}`
        const icon = <i className="fas fa-book fa-lg"></i>
        const label = this.renderTreeItemLabel(resource)
        treeNodes.push(
          <TreeItem 
            className="tree-item"
            key={treeID} 
            nodeId={resource.id} 
            icon={icon}
            label={label} >
          </TreeItem>
        )
      }

      const openResourcesLabel = this.renderTreeRootLabel()
      return (
        <TreeItem 
          nodeId="root" 
          label={openResourcesLabel}            
        >
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
              onNodeSelect={this.onClickNode}
            >
              { this.renderTree() }
            </TreeView>
          </div>
        )
    }

}

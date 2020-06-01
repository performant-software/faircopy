import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
import { Button, Typography } from '@material-ui/core';

export default class ProjectNavigator extends Component {

    onClickNode = (e) => {
      const { onSelectResource } = this.props
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      onSelectResource(resourceID)
    }

    renderTreeRootLabel() {
      const { onOpenResourceBrowser } = this.props

      const onClick = (event) => {
        onOpenResourceBrowser()
        event.preventDefault() 
      }

      return (
        <div>
          <Typography className="tree-item-name">Open Resources</Typography>
          <Button 
            className="tree-item-close"
            onClick={onClick}
          >
            <i className="fa fa-plus-circle fa-lg"></i>
          </Button>
        </div>
      )    
    }

    renderTreeItemLabel(resourceName, resourceID) {
      const { onCloseResource } = this.props

      const onClick = (event) => {
        onCloseResource(resourceID)
        event.preventDefault() 
      }

      return (
        <div>
          <Typography onClick={this.onClickNode} dataresourceid={resourceID} className="tree-item-name">{resourceName}</Typography>
          <Button 
            className="tree-item-close"
            onClick={onClick}
          >
            <i className="fa fa-minus-circle fa-lg"></i>
          </Button>
        </div>
      )
    }

    renderTree() {
      const { openResources, fairCopyProject } = this.props

      const treeNodes = []
      for( const resource of Object.values(openResources) ) {
        const {resourceID} = resource
        const {name} = fairCopyProject.resources[resourceID]
        const treeID = `nav-node-${resourceID}`
        const icon = <i className="fas fa-book fa-lg"></i>
        const label = this.renderTreeItemLabel(name,resourceID)
        treeNodes.push(
          <TreeItem 
            className="tree-item"
            key={treeID} 
            nodeId={resourceID} 
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
            >
              { this.renderTree() }
            </TreeView>
          </div>
        )
    }

}

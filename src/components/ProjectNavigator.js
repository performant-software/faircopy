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

    renderTreeItemLabel(resourceID) {
      const { onCloseResource } = this.props

      const onClick = (event) => {
        onCloseResource(resourceID)
        event.preventDefault() 
      }

      return (
        <div>
          <Typography className="tree-item-name">{resourceID}</Typography>
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
      const { openResources } = this.props

      const treeNodes = []
      for( const resource of Object.values(openResources) ) {
        const {resourceID} = resource
        const treeID = `nav-node-${resourceID}`
        const icon = <i className="fas fa-book fa-lg"></i>
        const label = this.renderTreeItemLabel(resourceID)
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
              onNodeSelect={this.onClickNode}
            >
              { this.renderTree() }
            </TreeView>
          </div>
        )
    }

}

import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
import { Button, Typography } from '@material-ui/core';

export default class ProjectNavigator extends Component {

    onClickNode = (e) => {
      const { onSelectResource } = this.props
      const { currentTarget } = e
      const resourceID = currentTarget.getAttribute('dataresourceid')
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
          <Typography className="open-resources">Open Resources</Typography>
          <Button 
            className="tree-item-close"
            onClick={onClick}
          >
            <i className="fa fa-home-alt fa-lg"></i>
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
        <div className='tree-item'>
          <Typography dataresourceid={resourceID} onClick={this.onClickNode} className="tree-item-name">{resourceName}</Typography>
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
      const { openResources, fairCopyProject, panelWidth } = this.props

      const treeNodes = []
      for( const resource of Object.values(openResources) ) {
        const {resourceID} = resource
        const {name, type} = fairCopyProject.resources[resourceID]
        const treeID = `nav-node-${resourceID}`
        const resourceIcon = type === 'text' ? 'fa fa-book' : type === 'facs' ? 'fa fa-images' : type === 'header' ? 'fa fa-file-alt' : 'fa fa-books'
        const icon = <i className={`${resourceIcon} fa-lg`}></i>
        const label = this.renderTreeItemLabel(name,resourceID)
        const nodeStyle = { wordWrap: 'break-word', maxWidth: panelWidth-105 }
        treeNodes.push(
          <TreeItem 
            className="tree-item"
            style={nodeStyle}
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
      const { selectedResource } = this.props

      return (
        <div id="ProjectNavigator">
          <TreeView
            selected={selectedResource}
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

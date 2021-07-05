import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
import { Button, Icon, Typography, Chip } from '@material-ui/core';


export default class ProjectNavigator extends Component {

    onClickNode = (e) => {
      const { onSelectResource } = this.props
      const { currentTarget } = e
      const resourceID = currentTarget.getAttribute('dataresourceid')
      onSelectResource(resourceID)  
    }

    renderTreeRootLabel() {
      return (
        <div>
          <Typography className="open-resources">Open Resources</Typography>          
        </div>
      )    
    }

    renderStatusChip(errorCount) {
      if( errorCount === 0 ) {
        return (
          <Icon className="fa fa-check-circle fa-xs" />
        )
      } else {
        const errorCountLabel = ( errorCount > 999 ) ? "1k+" : errorCount
        return (
          <Chip
              className="error-chip"
              label={errorCountLabel}
              size="small"
              color="secondary"
            />
        )  
      }
    }

    renderTreeItemLabel(resourceName, resourceID, errorCount) {
      const { onCloseResource } = this.props

      const onClick = (event) => {
        onCloseResource(resourceID)
        event.preventDefault() 
      }

      return (
        <div className='tree-item'>
          <Typography dataresourceid={resourceID} onClick={this.onClickNode} className="tree-item-name">{resourceName}</Typography>
          { this.renderStatusChip(errorCount) }
          <Button 
            className="tree-item-close"
            onClick={onClick}
          >
            <i className="fas fa-times-circle fa-lg"></i>
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
        const resourceIcon = type === 'text' ? 'far fa-book-open' : type === 'facs' ? 'far fa-images' : type === 'header' ? 'far fa-file-alt' : 'far fa-books'
        const errorCount = type === 'text' ? resource.errorCount : 0
        const icon = <i className={`${resourceIcon} fa-lg`}></i>
        const label = this.renderTreeItemLabel(name,resourceID, errorCount)
        const nodeStyle = { wordWrap: 'break-word', maxWidth: panelWidth }
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

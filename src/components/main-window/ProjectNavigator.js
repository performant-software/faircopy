import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';
import { Button, Icon, Typography, Chip, Tooltip } from '@material-ui/core';
import { getResourceIcon } from '../../model/resource-icon';
import { ellipsis } from '../../model/ellipsis'


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
          <Tooltip title={`Resource is valid.`}>
            <Icon aria-label="resource valid" className="fa fa-check-circle fa-xs" />
          </Tooltip>
        )
      } else {
        const errorCountLabel = ( errorCount > 999 ) ? "1k+" : errorCount
        return (
          <Tooltip title={`Resource has ${errorCount} validation errors.`}>
            <Chip
                className="error-chip"
                label={errorCountLabel}
                size="small"
                color="secondary"
              />
          </Tooltip>
        )  
      }
    }

    renderTreeItemLabel(resourceName, resourceID, errorCount) {
      const { onCloseResource, panelWidth } = this.props
      const maxLength = (panelWidth-170)/10 
      const resourceNameElided = ellipsis( resourceName, maxLength )

      const onClick = (event) => {
        onCloseResource(resourceID)
        event.preventDefault() 
      }

      return (
        <div className='tree-item'>
          <Typography dataresourceid={resourceID} onClick={this.onClickNode} className="tree-item-name">{resourceNameElided}</Typography>
          { this.renderStatusChip(errorCount) }
          <Tooltip title="Close resource">
            <Button 
              className="tree-item-close"
              onClick={onClick}
            >
              <i className="fas fa-times-circle fa-lg"></i>
            </Button>
          </Tooltip>
        </div>
      )
    }

    renderTree() {
      const { openResources, panelWidth } = this.props

      const treeNodes = []
      for( const resource of Object.values(openResources) ) {
        const {resourceEntry} = resource
        const {id: resourceID, name, type} = resourceEntry
        const treeID = `nav-node-${resourceID}`
        const resourceIcon = getResourceIcon(type,true)
        const errorCount = type !== 'facs' ? resource.errorCount : 0
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

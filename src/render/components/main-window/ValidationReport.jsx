import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';

import { scrollToNodePos } from '../../model/scrolling';
import { Typography } from '@material-ui/core';

export default class ValidationReport extends Component {

  renderErrorLine(error) {
    const { teiDocument } = this.props
    const { editorView } = teiDocument
    const { errorMessage, elementName, pos, nodeSelection } = error
    const treeID = `vr-${elementName}-${pos}`
    
    const onClick = () => {
      scrollToNodePos(pos, teiDocument.resourceID, editorView, true, nodeSelection)
    }

    const label = <Typography className='error-line'><i className="fa-solid fa-circle-exclamation"></i> {errorMessage}</Typography>

    return (
        <TreeItem onClick={onClick} key={treeID} nodeId={treeID} label={label} ></TreeItem>
    )
  }

  renderReport() {
    const { teiDocument } = this.props 
    const treeNodes = []
    for( const error of teiDocument.errors ) {
      treeNodes.push(this.renderErrorLine(error))
    }
    return treeNodes
  }

  render() {
    const { teiDocument } = this.props
    if( !teiDocument ) return null

    const { editorView, errors } = teiDocument
    if( !editorView ) return null

    if( errors.length === 0 ) return null

    return (
      <div id="ValidationReport">
        <TreeView    
          defaultExpanded={['root']}
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
        >
          <TreeItem nodeId="root" label="Validation Errors" >
            { this.renderReport() }
          </TreeItem>
        </TreeView>
      </div>
    )
  }

}

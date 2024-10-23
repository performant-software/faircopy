import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';

import { scrollToNodePos } from '../../model/scrolling';

export default class ValidationReport extends Component {

  renderErrorLine(error) {
    const { teiDocument } = this.props
    const { editorView } = teiDocument
    const { errorMessage, elementName, pos } = error
    const treeID = `vr-${elementName}-${pos}`
    
    const onClick = () => {
      scrollToNodePos(pos, teiDocument.resourceID, editorView, true)
    }

    return (
        <TreeItem onClick={onClick} key={treeID} nodeId={treeID} label={errorMessage} ></TreeItem>
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

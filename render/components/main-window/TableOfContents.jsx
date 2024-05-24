import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';

import { scrollToNodePos } from '../../model/scrolling';

export default class TableOfContents extends Component {

  isTreeNode(node) {
    const { teiSchema } = this.props.fairCopyProject
    const { hard } = teiSchema.elementGroups
    const name = node.type.name
    return hard.includes(name)
  }

  getNodeLabel(node) {
    const nodeType = node.type.name
    if( nodeType === 'div' &&  node.childCount > 0 ) {
      const firstChild = node.child(0)
      if( firstChild.type.name === 'head' ) {
        return firstChild.textContent.slice(0,100)
      }
    } 
    if( nodeType === 'sp' &&  node.childCount > 0 ) {
      const firstChild = node.child(0)
      if( firstChild.type.name === 'speaker' ) {
        return firstChild.textContent.slice(0,100)
      }
    } 

    return nodeType
  }

  renderNode(node,pos) {
    const { teiDocument } = this.props
    const { editorView } = teiDocument
    const treeID = `toc-${pos}`
    const label = this.getNodeLabel(node)
    
    const onClick = () => {
      scrollToNodePos(pos, teiDocument.resourceID, editorView)
    }

    return (
        <TreeItem onClick={onClick} key={treeID} nodeId={treeID} label={label} >
            { this.renderChildNodes(node,pos) }
        </TreeItem>
    )
  }

  renderChildNodes(node,pos) {
    const treeNodes = []
    const childCount = node.childCount
    let offset = 1
    for( let i=0; i < childCount; i++ ) {
      const childNode = node.child(i)
      if( this.isTreeNode(childNode) ) {
        treeNodes.push(this.renderNode(childNode,pos+offset)) 
      }   
      offset += childNode.nodeSize
    }
    return treeNodes
  }

  render() {
    const { teiDocument } = this.props
    if( !teiDocument ) return null

    const { editorView } = teiDocument
    if( !editorView ) return null
    const { doc } = editorView.state

    return (
      <div id="TableOfContents">
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
        >
          <TreeItem nodeId="root" label="Table of Contents" >
            { this.renderChildNodes(doc,0) }
          </TreeItem>
        </TreeView>
      </div>
    )
  }

}

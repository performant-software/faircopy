import React, { Component } from 'react';

import TreeView from '@material-ui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import TreeItem from '@material-ui/lab/TreeItem';

export default class CorpusNavigator extends Component {

    renderTree() {
      const { teiDocument } = this.props
      const { editorView } = teiDocument

      if( !editorView ) return null

      const { doc } = editorView.state

      let nodeIDCount = 0
      const findTreeNodes = (node) => {
        const childCount = node.childCount
        const treeNodes = []
        for( let i=0; i < childCount; i++ ) {
          const childNode = node.child(i) 
          if( childNode.type.groups.includes('block') ) {
            const treeID = `div-${nodeIDCount++}`
            treeNodes.push(
              <TreeItem key={treeID} nodeId={treeID} label="div" >
                { findTreeNodes(childNode) }
              </TreeItem>
            )
          }   
        }
        return treeNodes
      }

      const tree = (
        <TreeItem nodeId="root" label="body" >
          { findTreeNodes(doc) }
        </TreeItem>
      )
      return tree
    }

    render() {
        return (
            "Corpus"
        )
    }

    renderss() {
        return (
          <div id="TableOfContents">
            <TreeView
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
            >
              { this.renderTree() }
            </TreeView>
          </div>
        )
    }

}

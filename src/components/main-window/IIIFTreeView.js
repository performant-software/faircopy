import React, { Component } from 'react'
import { alpha, withStyles } from '@material-ui/core/styles'
import TreeView from '@material-ui/lab/TreeView'
import TreeItem from '@material-ui/lab/TreeItem'

export default class IIIFTreeView extends Component {

  constructor() {
    super()
    this.state = {
      expanded: [],
      selected: []
    }
  }

  renderFacs(facsItem) {
    const { onToggleItem, selectedItems } = this.props
    const { manifestID, name, surfaces, texts } = facsItem

    const onIconClick = (e, target) => {
      onToggleItem(target)
    }

    const textEls = []
    let i=0
    for( const text of texts ) {
      const { manifestID, name } = text
      const nodeId = `textnode-${manifestID}-${i++}`
      const selected = selectedItems.includes(manifestID)
      textEls.push(
        <StyledTreeItem onIconClick={onIconClick} endIcon={renderCheckedSquare(selected)} key={nodeId} nodeId={nodeId} label={name} />
      )
    }

    // how many surfaces have texts and how many unique types?
    const textTypes = {}
    for( const surface of surfaces ) {
      for( const text of surface.texts ) {
        const { name } = text
        if( !textTypes[name] ) textTypes[name] = 1
        else textTypes[name]++
      }
    }

    for( const textType of Object.keys(textTypes) ) {
      const count = textTypes[textType]
      const nodeId = `textnode-${manifestID}-${i++}`
      const selected = selectedItems.includes(manifestID)
      textEls.push(
        <StyledTreeItem onIconClick={onIconClick} endIcon={renderCheckedSquare(selected)} key={nodeId} nodeId={nodeId} label={`${textType} (${count})`} />
      )
    }

    return (
      <StyledTreeItem key={manifestID} nodeId={manifestID} label={`${name} (${surfaces.length})`}>
        { textEls }
      </StyledTreeItem>
    )
  }

  renderFacsRef(facsItem) {
    const { manifestID, name } = facsItem

    return (
      <StyledTreeItem key={manifestID} nodeId={manifestID} label={name} />
    )
  }

  renderCollectionRef(collectionItem) {
    const { manifestID, name } = collectionItem

    return (
      <StyledTreeItem key={manifestID} nodeId={manifestID} label={name} />
    )
  }

  renderCollection(collectionItem) {
    const { manifestID, name, members } = collectionItem

    const children = []
    for( const member of members ) {
      const child = this.renderTreeItem(member)
      if( child ) children.push(child)
    }

    return (
      <StyledTreeItem key={manifestID} nodeId={manifestID} label={name}>
        { children }
      </StyledTreeItem>
    )
  }

  renderTreeItem(treeItem) {
    const { type } = treeItem
    if( type === 'facs' ) {
      return this.renderFacs(treeItem)
    } else if( type === 'facs-ref') {
      return this.renderFacsRef(treeItem)
    } else if( type === 'collection') {
      return this.renderCollection(treeItem)
    } else if( type === 'collection-ref') {
      return this.renderCollectionRef(treeItem)
    } else {
      return null
    }
  }


  onSelect = (e, selected) => {
    const { onRequestItem } = this.props
    if( !selected.startsWith('textnode-') ) {
      onRequestItem(selected)
    }
  }

  render() {
    const { iiifTree } = this.props
    
    return (
        <div id='IIIFTreeView'>
            <TreeView
                defaultCollapseIcon={<i className="fas fa-caret-down fa-sm"></i>}
                defaultExpandIcon={<i className="fas fa-caret-right fa-sm"></i>}
                onNodeSelect={this.onSelect}
            >
               { this.renderTreeItem(iiifTree) }
            </TreeView>
        </div>
    )
  }
}

function renderCheckedSquare(checked) {
  const chk = checked ? 'check-' : ''
  return (
    <i className={`far fa-${chk}square fa-sm`}></i>
  )
}
  
const StyledTreeItem = withStyles((theme) => ({
  iconContainer: {
    '& .close': {
      opacity: 0.3,
    },
  },
  group: {
    marginLeft: 7,
    paddingLeft: 18,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
  },
}))((props) => <TreeItem {...props} />);
  
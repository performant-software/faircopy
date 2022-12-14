import React, { Component } from 'react'
import SvgIcon from '@material-ui/core/SvgIcon';
import { alpha, withStyles } from '@material-ui/core/styles';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem from '@material-ui/lab/TreeItem';

export default class IIIFTreeView extends Component {

  constructor() {
    super()
    this.state = {
      expanded: [],
      selected: []
    }
  }

  renderFacs(facsItem) {
    const { manifestID, name, surfaces, texts } = facsItem

    const textEls = []
    let i=0
    for( const text of texts ) {
      const { name } = text
      const nodeId = `textnode-${manifestID}-${i++}`
      textEls.push(
        <StyledTreeItem key={nodeId} nodeId={nodeId} label={name} />
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

    let j=0
    for( const textType of Object.keys(textTypes) ) {
      const count = textTypes[textType]
      const nodeId = `textnode-${manifestID}-${j++}`
      textEls.push(
        <StyledTreeItem key={nodeId} nodeId={nodeId} label={`${textType} (${count})`} />
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
                defaultCollapseIcon={<MinusSquare />}
                defaultExpandIcon={<PlusSquare />}
                defaultEndIcon={<CloseSquare />}
                onNodeSelect={this.onSelect}
            >
               { this.renderTreeItem(iiifTree) }
            </TreeView>
        </div>
    )
  }
}


function MinusSquare(props) {
    return (
      <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
        {/* tslint:disable-next-line: max-line-length */}
        <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
      </SvgIcon>
    );
  }
  
  function PlusSquare(props) {
    return (
      <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
        {/* tslint:disable-next-line: max-line-length */}
        <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
      </SvgIcon>
    );
  }
  
  function CloseSquare(props) {
    return (
      <SvgIcon className="close" fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
        {/* tslint:disable-next-line: max-line-length */}
        <path d="M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z" />
      </SvgIcon>
    );
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
  
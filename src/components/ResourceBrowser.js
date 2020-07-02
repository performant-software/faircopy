import React, { Component } from 'react';
import { Button, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Checkbox } from '@material-ui/core';
import SearchBar from './SearchBar'

export default class ResourceBrowser extends Component {

  constructor() {
    super()
    this.state = {
      allChecked: false,
      checked: {}
    }
  }

  onOpenActionMenu = (anchorEl) => {
    const { onOpenPopupMenu } = this.props
    const menuOptions = [
      {
        id: 'open',
        label: 'Open',
        action: this.createResourceAction('open')
      },
      {
        id: 'edit-tags',
        label: 'Edit Tags',
        disabled: true,
        action: this.createResourceAction('edit-tags')
      },
      {
        id: 'export',
        label: 'Export',
        action: this.createResourceAction('export')
      },
      {
        id: 'delete',
        label: 'Delete',
        action: this.createResourceAction('delete')
      }
    ]
    onOpenPopupMenu(menuOptions, anchorEl)
  }

  createResourceAction(actionID) {    
    return () => {
      const { onResourceAction } = this.props
      const { checked } = this.state
      const resourceIDs = []
      for( const resourceID of Object.keys(checked) ) {
        if( checked[resourceID] ) resourceIDs.push(resourceID)
      }
      onResourceAction(actionID, resourceIDs)
    }
  }

  renderToolbar() {
    const { onEditResource, onImportResource } = this.props
    const { checked } = this.state

    const buttonProps = {
      className: 'toolbar-button',
      variant: "outlined",
      size: 'small',
      disableRipple: true,
      disableFocusRipple: true
    }

    const actionsEnabled = Object.values(checked).find( c => c === true )

    return (
      <div className="toolbar">
        <Button onClick={onEditResource} {...buttonProps}>Create</Button>    
        <Button onClick={onImportResource} {...buttonProps}>Import</Button>    
        <Button 
          disabled={!actionsEnabled}
          ref={(el)=> { this.actionButtonEl = el }}
          onClick={()=>{this.onOpenActionMenu(this.actionButtonEl)}}         
          {...buttonProps}
        >Actions<i className='down-caret fas fa-caret-down fa-lg'></i></Button> 
      </div>
    )
  }

  renderResourceTable() {

    const onClick = (e) => {
      const { onResourceAction } = this.props
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      onResourceAction( 'open', [resourceID] )
    }

    const toggleAll = () => {
      const { fairCopyProject } = this.props
      const { resources } = fairCopyProject
      const { checked, allChecked } = this.state
      const nextAllChecked = !allChecked
      const nextChecked = { ...checked }
      for( const resource of Object.values(resources) ) {
        nextChecked[resource.id] = nextAllChecked
      }
      this.setState({ ...this.state, checked: nextChecked, allChecked: nextAllChecked })
    }

    const onClickCheck = (e) => {
      const { checked } = this.state
      const nextChecked = { ...checked }
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      nextChecked[resourceID] = checked[resourceID] ? false : true
      this.setState({ ...this.state, checked: nextChecked })
    }

    const cellProps = {
      padding: 'none',
      component: "th",
      scope: "row"
    }

    const { checked, allChecked } = this.state
    const { fairCopyProject } = this.props
    const { resources } = fairCopyProject

    const resourceRows = []
    for( const resource of Object.values(resources) ) {
      const check = checked[resource.id] === true
      resourceRows.push(
        <TableRow hover key={`resource-${resource.id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} dataresourceid={resource.id} color="default" checked={check} />
          </TableCell>
          <TableCell onClick={onClick} dataresourceid={resource.id} {...cellProps} >
            {resource.name}
          </TableCell>
          <TableCell onClick={onClick} dataresourceid={resource.id} {...cellProps} >
            {resource.localID}
          </TableCell>
          <TableCell {...cellProps} >
            {resource.type}
          </TableCell>
          <TableCell {...cellProps} >
            ---
          </TableCell>
          <TableCell {...cellProps} >
            ---
          </TableCell>
        </TableRow>
      )
    }
  
    return (
      <TableContainer className="table-container" component={Paper}>
        <Table stickyHeader size="small" >
          <TableHead>
            <TableRow>
              <TableCell padding="none"><Checkbox onClick={toggleAll} color="default" checked={allChecked} /></TableCell>
              <TableCell padding="none">Name</TableCell>
              <TableCell padding="none">ID</TableCell>
              <TableCell padding="none">Type</TableCell>
              <TableCell padding="none">Tags</TableCell>
              <TableCell padding="none">Last Modified</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { resourceRows }
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  render() {
      const { width, fairCopyProject } = this.props
      const { resources } = fairCopyProject
      const resourceCount = Object.keys(resources).length
      const s = resourceCount === 1 ? '' : 's'

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <div className="titlebar">
              <SearchBar></SearchBar>
              <Typography component="h1" variant="h6">Browse Resources ({resourceCount} resource{s})</Typography>
          </div>
          { this.renderToolbar() }
          <div>
              { this.renderResourceTable() }
          </div>
        </div>
      )
  }

}

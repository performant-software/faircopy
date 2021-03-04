import React, { Component } from 'react';
import { Button, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Checkbox } from '@material-ui/core';

const rowsPerPage = 100

export default class ResourceBrowser extends Component {

  constructor() {
    super()
    this.state = {
      allChecked: false,
      currentPage: 0,
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
        id: 'compare',
        label: 'Compare',
        disabled: true,
        action: this.createResourceAction('compare')
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
    // TODO filter out the tei doc resources
    return () => {
      const { onResourceAction } = this.props
      const { checked } = this.state
      const resourceIDs = []
      for( const resourceID of Object.keys(checked) ) {
        if( checked[resourceID] ) resourceIDs.push(resourceID)
      }
      if( onResourceAction(actionID, resourceIDs) ) {
        this.setState({ ...this.state, checked: {}, allChecked: false })
      }
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
        <Button onClick={onEditResource} {...buttonProps}>New Resource</Button>    
        <Button onClick={onEditResource} {...buttonProps}>Create From Template</Button>    
        <Button onClick={onImportResource} {...buttonProps}>Import XML</Button>    
        <Button onClick={onImportResource} {...buttonProps}>Import IIIF</Button>    
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
      const { onResourceAction, resources } = this.props
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      const resource = resources[resourceID]
      if( resource.type === 'teidoc' ) {
        onResourceAction( 'open-teidoc', resourceID )         
      } else {
        onResourceAction( 'open', [resourceID] )         
      }
    }

    const toggleAll = () => {
      const { resources } = this.props
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

    const { checked, allChecked, currentPage } = this.state
    const { resources } = this.props
    
    const resourceRows = []
    for( const resource of Object.values(resources) ) {
      if( !resource  ) continue
      const check = checked[resource.id] === true
      const resourceIcon = resource.type === 'text' ? 'fa fa-book' : resource.type === 'facs' ? 'fa fa-images' : resource.type === 'header' ? 'fa fa-file-alt' : 'fa fa-books'
      resourceRows.push(
        <TableRow hover key={`resource-${resource.id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} disabled={resource.type === 'header'} dataresourceid={resource.id} color="default" checked={check} />
          </TableCell>
          <TableCell {...cellProps} >
            <i className={`${resourceIcon} fa-lg`}></i>
          </TableCell>
          <TableCell onClick={onClick} dataresourceid={resource.id} {...cellProps} >
            {resource.name}
          </TableCell>
          <TableCell onClick={onClick} dataresourceid={resource.id} {...cellProps} >
            {resource.localID}
          </TableCell>
          <TableCell {...cellProps} >
            ---
          </TableCell>
        </TableRow>
      )
    }

    const onChangePage = (e,page) => { this.setState({...this.state, currentPage: page})}
    const start = rowsPerPage * currentPage
    const end = start + 100
  
    return (
      <Paper >
          <TableContainer className="table-container">
              <Table stickyHeader size="small" >
                  <TableHead>
                      <TableRow>
                          <TableCell padding="none"><Checkbox onClick={toggleAll} color="default" checked={allChecked} /></TableCell>
                          <TableCell padding="none">Type</TableCell>
                          <TableCell padding="none">Name</TableCell>
                          <TableCell padding="none">ID</TableCell>
                          <TableCell padding="none">Tags</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      { resourceRows.slice(start,end) }
                  </TableBody>
              </Table>
          </TableContainer>
          <TablePagination
              component="div"
              rowsPerPageOptions={[rowsPerPage]}
              count={resourceRows.length}
              rowsPerPage={rowsPerPage}
              page={currentPage}
              onChangePage={onChangePage}
          />
      </Paper>
  )
  }

  render() {
      const { width, teiDocName, onResourceAction } = this.props

      const onClickHome = () => {
        onResourceAction( 'close-teidoc' )   
      }

      const docTitle = teiDocName ? <span><i className="fa fa-chevron-right"></i> <i className="fa fa-books"></i> {teiDocName}</span> : ""

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <div className="titlebar">
            <Typography component="h1" variant="h6"><span className="home-link" onClick={onClickHome}><i className="fa fa-home-alt"></i> Project Resources</span> {docTitle}</Typography>
          </div>
          { this.renderToolbar() }
          <div>
              { this.renderResourceTable() }
          </div>
        </div>
      )
  }

}

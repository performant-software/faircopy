import React, { Component } from 'react';
import { Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Tooltip, Checkbox } from '@material-ui/core';
import TitleBar from './TitleBar'

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
        id: 'move',
        label: 'Move',
        action: this.createResourceAction('move')
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
    const { onEditResource, teiDoc, onImportResource, onEditTEIDoc } = this.props
    const { checked } = this.state

    const buttonProps = {
      className: 'toolbar-button',
      variant: "outlined",
      size: 'small',
      disableRipple: true,
      disableFocusRipple: true
    }

    const onImportXML = () => { onImportResource('xml') }
    const onImportIIIF = () => { onImportResource('iiif') }
    const actionsEnabled = Object.values(checked).find( c => c === true )

    return (
      <div className="toolbar">
        <Button onClick={onEditResource} {...buttonProps}>New Resource</Button>    
        <Button onClick={onImportXML} {...buttonProps}>Import XML</Button>    
        <Button onClick={onImportIIIF} {...buttonProps}>Import IIIF</Button>    
        <Button 
          disabled={!actionsEnabled}
          ref={(el)=> { this.actionButtonEl = el }}
          onClick={()=>{this.onOpenActionMenu(this.actionButtonEl)}}         
          {...buttonProps}
        >Actions<i className='down-caret fas fa-caret-down fa-lg'></i></Button> 
        { teiDoc && <Tooltip title="Edit Document Properties">
            <span>
                <Button
                    onClick={onEditTEIDoc}
                    className='toolbar-button'
                    disableRipple={true}
                    disableFocusRipple={true}
                    style={{float: 'right'}}
                >
                    <i className="far fa-edit fa-2x"></i>
                </Button>                   
            </span>
        </Tooltip> }
      </div>
    )
  }

  renderResourceTable() {

    const onClick = (e) => {
      // if we clicked on check, let onClickCheck handle it
      if( e.target.nodeName === 'INPUT' ) return
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
        if( resource.type !== 'header' ) nextChecked[resource.id] = nextAllChecked
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
      if( !resource ) continue
      const check = checked[resource.id] === true
      const resourceIcon = resource.type === 'text' ? 'fa fa-book' : resource.type === 'facs' ? 'fa fa-images' : resource.type === 'header' ? 'fa fa-file-alt' : 'fa fa-books'
      resourceRows.push(
        <TableRow hover onClick={onClick} dataresourceid={resource.id} key={`resource-${resource.id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} disabled={resource.type === 'header'} dataresourceid={resource.id} color="default" checked={check} />
          </TableCell>
          <TableCell {...cellProps} >
            <i className={`${resourceIcon} fa-lg`}></i>
          </TableCell>
          <TableCell {...cellProps} >
            {resource.name}
          </TableCell>
          <TableCell {...cellProps} >
            {resource.localID}
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
      const { width, teiDoc, onResourceAction } = this.props

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <TitleBar teiDocName={ teiDoc ? teiDoc.name : null } onResourceAction={onResourceAction}></TitleBar>
          { this.renderToolbar() }
          <div>
              { this.renderResourceTable() }
          </div>
        </div>
      )
  }

}

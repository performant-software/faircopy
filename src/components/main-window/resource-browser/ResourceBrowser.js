import React, { Component } from 'react';
import { Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Tooltip, Checkbox } from '@material-ui/core';
import TitleBar from '../TitleBar'
import { getResourceIcon, getActionIcon, getResourceIconLabel } from '../../../model/resource-icon';

import { isEntryEditable } from '../../../model/FairCopyProject'

export default class ResourceBrowser extends Component {

  constructor() {
    super()
    this.initialState = {
      allChecked: false,
      checked: {}
    }
    this.state = this.initialState
  }

  onOpenActionMenu = (anchorEl) => {
    const { onOpenPopupMenu, fairCopyProject } = this.props
    const { remote: remoteProject } = fairCopyProject
    const loggedIn = fairCopyProject.isLoggedIn()

    const remoteProjectOptions = !remoteProject || !loggedIn ? [] : [
      {
        id: 'check-in',
        label: 'Check In',
        action: this.createResourceAction('check-in')
      },
      {
        id: 'check-out',
        label: 'Check Out',
        action: this.createResourceAction('check-out')
      }
    ]
    
    const menuOptions = [
      {
        id: 'open',
        label: 'Open',
        action: this.createResourceAction('open')
      },
      ...remoteProjectOptions,
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

    // you can recover deleted items when logged out
    if( remoteProject ) {
      menuOptions.push({
        id: 'recover',
        label: 'Recover',
        action: this.createResourceAction('recover')
      })
    }
    
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
      size: 'small'
    }

    const onImportXML = () => { onImportResource('xml') }
    const onImportIIIF = () => { onImportResource('iiif') }
    const actionsEnabled = Object.values(checked).find( c => c === true )

    return (
      <div className="toolbar">
        <Button onClick={onEditResource} {...buttonProps}>New Resource</Button>    
        <Button onClick={onImportXML} {...buttonProps}>Import Texts</Button>    
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
    const { onResourceAction, fairCopyProject, resourceView, resourceIndex } = this.props
    const { remote: remoteProject, email } = fairCopyProject
    const { currentPage, rowsPerPage } = resourceView

    const onOpen = (resourceID) => {
      const resource = resourceIndex.find(resourceEntry => resourceEntry.id === resourceID )
      if( resource.type === 'teidoc' ) {
        this.setState(this.initialState)
        onResourceAction( 'open-teidoc', resourceID )         
      } else {
        onResourceAction( 'open', [resourceID] )         
      }
    }

    const onClick = (e) => {
      // if we clicked on check, let onClickCheck handle it
      if( e.target.nodeName === 'INPUT' ) return
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      onOpen(resourceID)
    }

    const onKeyUp = (e) => {
      if( e.keyCode === 13 ) {
        const resourceID = e.currentTarget.getAttribute('dataresourceid')
        onOpen(resourceID)  
      }
    }

    const toggleAll = () => {
      const { checked, allChecked } = this.state
      const nextAllChecked = !allChecked
      const nextChecked = { ...checked }
      for( const resource of resourceIndex ) {
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
      component: "td",
      scope: "row"
    }

    const { checked, allChecked } = this.state
    
    const resourceRows = []
    
    for( const resource of resourceIndex ) {
      if( !resource ) continue
      const { id, name, localID, type, local, deleted } = resource 
      const check = checked[id] === true
      const resourceIcon = getResourceIcon(type)
      const status = local ? 'local' : 'online'
      const { label, icon } = getActionIcon( false, deleted, local, isEntryEditable( resource, email ))
      const lastModified = ''
      
      resourceRows.push(
        <TableRow hover onClick={onClick} onKeyUp={onKeyUp} dataresourceid={id} key={`resource-${id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} disabled={type === 'header'} dataresourceid={id} color="default" checked={check} />
          </TableCell>
          { remoteProject && 
          <TableCell {...cellProps} >
            { icon && <i aria-label={label} className={`fa ${icon} fa-lg`}></i> }
          </TableCell>
          }
          <TableCell {...cellProps} >
            <i aria-label={getResourceIconLabel(type)} className={`${resourceIcon} fa-lg`}></i>
          </TableCell>
          <TableCell {...cellProps} >
            {name}
          </TableCell>
          <TableCell {...cellProps} >
            {localID}
          </TableCell>
          { remoteProject && 
          <TableCell {...cellProps} >
           { status }
          </TableCell>
          }
          { remoteProject && 
          <TableCell {...cellProps} >
            { lastModified }
          </TableCell>        
          }
        </TableRow>
      )
    }

    // TODO make this update view
    const onChangePage = (e,page) => { this.setState({...this.state, currentPage: page})}
    // const start = rowsPerPage * currentPage
    // const end = start + 100
  
    return (
      <Paper >
          <TableContainer className="table-container">
              <Table stickyHeader size="small" >
                  <caption>This table lists the resources in this project.</caption>
                  <TableHead>
                      <TableRow>
                          <TableCell ><Checkbox onClick={toggleAll} color="default" checked={allChecked} /></TableCell>
                          { remoteProject && <TableCell><i className="fa fa-pen fa-lg"></i></TableCell> }
                          <TableCell>Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>ID</TableCell>
                          { remoteProject && <TableCell>Status</TableCell> }
                          { remoteProject && <TableCell>Last Modified</TableCell> }
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      { resourceRows }
                  </TableBody>
              </Table>
          </TableContainer>
          <TablePagination
              component="div"
              rowsPerPageOptions={[rowsPerPage]}
              count={resourceRows.length}
              rowsPerPage={rowsPerPage}
              page={currentPage}
              onPageChange={onChangePage}
          />
      </Paper>
  )
  }

  render() {
      const { width, teiDoc, fairCopyProject, onResourceAction } = this.props
      const { remote, isLoggedIn } = fairCopyProject

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <TitleBar teiDocName={ teiDoc ? teiDoc.name : null } onResourceAction={onResourceAction} isLoggedIn={isLoggedIn} remoteProject={remote}></TitleBar>
          { this.renderToolbar() }
          <main>
              { this.renderResourceTable() }
          </main>
        </div>
      )
  }

}

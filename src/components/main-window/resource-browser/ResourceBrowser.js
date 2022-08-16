import React, { Component } from 'react';
import { Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Tooltip, Checkbox, Typography } from '@material-ui/core';
import TitleBar from '../TitleBar'
import { getResourceIcon, getActionIcon, getResourceIconLabel } from '../../../model/resource-icon';
import { isEntryEditable, isCheckedOutRemote } from '../../../model/FairCopyProject'
import { logout, isLoggedIn } from '../../../model/cloud-api/auth'

const fairCopy = window.fairCopy

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
        disabled: true,
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
      const resourceIDs = [], resourceEntries = []
      for( const resourceID of Object.keys(checked) ) {
        if( checked[resourceID] ) {
          resourceIDs.push(resourceID)
          resourceEntries.push(checked[resourceID])
        }
      }
      if( onResourceAction(actionID, resourceIDs, resourceEntries) ) {
        this.setState({ ...this.state, checked: {}, allChecked: false })
      }
    }
  }

  renderLoginButton(buttonProps) {
    const { onLogin, fairCopyProject } = this.props
    const { remote, email, serverURL } = fairCopyProject
    const loggedIn = remote ? isLoggedIn(email, serverURL) : false

    const onLogout = () => {
      logout(email, serverURL)
      this.setState({...this.state})
    }

    return loggedIn ? 
        <Button {...buttonProps} onClick={onLogout}>Log Out</Button> :
        <Button {...buttonProps} onClick={onLogin}>Log In</Button>
  }

  renderToolbar() {
    const { onEditResource, teiDoc, onImportResource, onEditTEIDoc, currentView } = this.props
    const { checked } = this.state

    const buttonProps = {
      className: 'toolbar-button',
      variant: "outlined",
      size: 'small'
    }

    const onImportXML = () => { onImportResource('xml') }
    const onImportIIIF = () => { onImportResource('iiif') }
    const actionsEnabled = Object.values(checked).find( c => !!c )

    return (
      <div className="toolbar">
        { currentView === 'home' && 
          <div className='inline-button-group'>
            <Button onClick={onEditResource} {...buttonProps}>New Resource</Button>    
            <Button onClick={onImportXML} {...buttonProps}>Import Texts</Button>    
            <Button onClick={onImportIIIF} {...buttonProps}>Import IIIF</Button>              
          </div>  
        }
        { currentView === 'remote' &&
          <div className='inline-button-group'>
            { this.renderLoginButton(buttonProps) }
          </div>        
        }
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
    const { onResourceAction, fairCopyProject, resourceView, resourceIndex, currentView } = this.props
    const { remote: remoteProject, email } = fairCopyProject
    const { currentPage, rowsPerPage, totalRows } = resourceView

    const onOpen = (resourceID) => {
      const resource = resourceIndex.find(resourceEntry => resourceEntry.id === resourceID )
      if( resource.deleted ) return
      if( resource.type === 'teidoc' ) {
        this.setState(this.initialState)
        onResourceAction( 'open-teidoc', resourceID, resource )         
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
        if( resource.type !== 'header' ) nextChecked[resource.id] = nextAllChecked ? resource : null
      }
      this.setState({ ...this.state, checked: nextChecked, allChecked: nextAllChecked })
    }

    const onClickCheck = (e) => {
      const { checked } = this.state
      const nextChecked = { ...checked }
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      const resourceEntry = resourceIndex.find(resourceEntry => resourceEntry.id === resourceID )
      nextChecked[resourceID] = checked[resourceID] ? null : resourceEntry
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
      const check = !!checked[id] 
      const resourceIcon = getResourceIcon(type)
      const editable = isEntryEditable( resource, email )
      const checkedOutRemote = !editable ? isCheckedOutRemote( resource, email ) : false
      const { label, icon } = getActionIcon( false, local, editable|deleted, checkedOutRemote )
      const lastModified = !editable ? new Date(resource.lastAction.created_at).toLocaleString() : ''
      const textClass = deleted ? 'deleted-resource' : ''
      const iconClass = deleted ? 'deleted-icon' : ''
      
      resourceRows.push(
        <TableRow hover onClick={onClick} onKeyUp={onKeyUp} dataresourceid={id} key={`resource-${id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} disabled={type === 'header'} dataresourceid={id} color="default" checked={check} />
          </TableCell>
          { remoteProject && 
          <TableCell {...cellProps} >
            { icon && <i aria-label={label} className={`${icon} ${iconClass} fa-lg`}></i> }
          </TableCell>
          }
          <TableCell {...cellProps} >
            <i aria-label={getResourceIconLabel(type)} className={`${resourceIcon} ${iconClass} fa-lg`}></i>
          </TableCell>
          <TableCell {...cellProps} >
            <Typography className={textClass}>{name}</Typography>
          </TableCell>
          <TableCell {...cellProps} >
            <Typography className={textClass}>{localID}</Typography>
          </TableCell>
          { remoteProject && 
          <TableCell {...cellProps} >
            <Typography className={textClass}>{lastModified}</Typography>
          </TableCell>        
          }
        </TableRow>
      )
    }

    const onChangePage = (e,page) => { 
      const { indexParentID, parentEntry } = resourceView
      const resourceViewRequest = { currentView, indexParentID, parentEntry, currentPage: page+1 }
      fairCopy.services.ipcSend('requestResourceView', resourceViewRequest )
    }

    const tableCaption = currentView === 'home' ? 'This table lists the resources on your computer.' : 'This table lists the resources on the server.'
  
    return (
      <Paper >
          <TableContainer className="table-container">
              <Table stickyHeader size="small" >
                  <caption>{tableCaption}</caption>
                  <TableHead>
                      <TableRow>
                          <TableCell ><Checkbox onClick={toggleAll} color="default" checked={allChecked} /></TableCell>
                          { remoteProject && <TableCell><i className="fa fa-pen fa-lg"></i></TableCell> }
                          <TableCell>Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>ID</TableCell>
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
              count={totalRows}
              rowsPerPage={rowsPerPage}
              page={currentPage-1}
              onPageChange={onChangePage}
          />
      </Paper>
  )
  }

  render() {
      const { width, teiDoc, fairCopyProject, onResourceAction, resourceView, currentView } = this.props
      const { loading } = resourceView
      const { isLoggedIn } = fairCopyProject

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <TitleBar parentResource={teiDoc} onResourceAction={onResourceAction} isLoggedIn={isLoggedIn} currentView={currentView} loading={loading}></TitleBar>
          { this.renderToolbar() }
          <main>
              { this.renderResourceTable() }
          </main>
        </div>
      )
  }

}

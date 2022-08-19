import React, { Component } from 'react';
import { Button, Card, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Tooltip, Checkbox, Typography, CardContent } from '@material-ui/core';
import TitleBar from '../TitleBar'
import { getResourceIcon, getActionIcon, getResourceIconLabel } from '../../../model/resource-icon';
import { isEntryEditable, isCheckedOutRemote } from '../../../model/FairCopyProject'
import { logout, isLoggedIn } from '../../../model/cloud-api/auth'

export default class ResourceBrowser extends Component {

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
      const { onResourceAction, resourceCheckmarks } = this.props
      const resourceIDs = [], resourceEntries = []
      for( const resourceID of Object.keys(resourceCheckmarks) ) {
        const resourceEntry = resourceCheckmarks[resourceID]
        if( resourceEntry ) {
          resourceIDs.push(resourceEntry.id)
          resourceEntries.push(resourceEntry)
        }
      }
      onResourceAction(actionID, resourceIDs, resourceEntries)
    }
  }

  renderLoginButton(buttonProps) {
    const { onLogin, fairCopyProject } = this.props
    const { remote, email, serverURL } = fairCopyProject
    const loggedIn = remote ? isLoggedIn(email, serverURL) : false

    const onLogout = () => {
      logout(email, serverURL)
    }

    return loggedIn ? 
        <Button {...buttonProps} onClick={onLogout}>Log Out</Button> :
        <Button {...buttonProps} onClick={onLogin}>Log In</Button>
  }

  renderToolbar() {
    const { onEditResource, teiDoc, onImportResource, onEditTEIDoc, currentView, resourceCheckmarks } = this.props

    const buttonProps = {
      className: 'toolbar-button',
      variant: "outlined",
      size: 'small'
    }

    const onImportXML = () => { onImportResource('xml') }
    const onImportIIIF = () => { onImportResource('iiif') }
    const actionsEnabled = Object.values(resourceCheckmarks).find( c => !!c )

    return (
      <div className="toolbar">
        { currentView === 'home' && 
          <div className='inline-button-group'>
            <Button onClick={onEditResource} {...buttonProps}>New Resource</Button>    
            <Button onClick={onImportXML} {...buttonProps}>Import Texts</Button>    
            <Button onClick={onImportIIIF} {...buttonProps}>Import IIIF</Button>              
          </div>  
        }
        <Button 
          disabled={!actionsEnabled}
          ref={(el)=> { this.actionButtonEl = el }}
          onClick={()=>{this.onOpenActionMenu(this.actionButtonEl)}}         
          {...buttonProps}
        >Actions<i className='down-caret fas fa-caret-down fa-lg'></i></Button> 
        { teiDoc && currentView === 'home' && 
          <Tooltip title="Edit Document Properties">
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
          </Tooltip> 
        }
        { currentView === 'remote' &&
         <div className='inline-button-group right-button'>
          { this.renderLoginButton(buttonProps) }
        </div>   
        }
      </div>
    )
  }

  renderResourceTable() {
    const { onResourceAction, fairCopyProject, resourceView, resourceIndex, currentView, resourceCheckmarks, allResourcesCheckmarked } = this.props
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
      const { setAllCheckmarks } = this.props
      setAllCheckmarks(!allResourcesCheckmarked)
    }

    const onClickCheck = (e) => {
      const { setResourceCheckmark } = this.props
      const resourceID = e.currentTarget.getAttribute('dataresourceid')
      const resourceEntry = resourceIndex.find(resourceEntry => resourceEntry.id === resourceID )
      setResourceCheckmark( resourceEntry, !!!resourceCheckmarks[resourceID] )
    }

    const cellProps = {
      component: "td",
      scope: "row"
    }
    
    const resourceRows = []
    
    for( const resource of resourceIndex ) {
      if( !resource ) continue
      const { id, name, localID, type, local, deleted } = resource 
      const check = !!resourceCheckmarks[id] 
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
            { icon && 
              <Tooltip title={label}>
                <i aria-label={label} className={`${icon} ${iconClass} fa-lg`}></i>
              </Tooltip>
            }
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
      // pages counted ordinally outside this control (because that is how server counts them)
      this.props.onPageChange(page+1)
    }

    const tableCaption = currentView === 'home' ? 'This table lists the resources on your computer.' : 'This table lists the resources on the server.'
  
    return (
      <Paper >
          <TableContainer className="table-container">
              <Table stickyHeader size="small" >
                  <caption>{tableCaption}</caption>
                  <TableHead>
                      <TableRow>
                          <TableCell ><Checkbox onClick={toggleAll} color="default" checked={allResourcesCheckmarked} /></TableCell>
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

  renderEmptyListMessage() {
    const { resourceIndex, currentView } = this.props
    if( resourceIndex.length > 0 || currentView !== 'home' ) return null

    return (
      <Card raised={true} className='empty-list-card'>
        <CardContent>
          <Typography>There are no local resources. Click on the <i className="fa fa-home-alt"></i> icon to see resources on the server.</Typography>
        </CardContent>
      </Card>
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
              { this.renderEmptyListMessage() }
          </main>
        </div>
      )
  }

}

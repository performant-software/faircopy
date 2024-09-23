import React, { Component } from 'react';
import { Button, Card, InputAdornment, IconButton, TableContainer, TableSortLabel, Table, Input, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Tooltip, Checkbox, Typography, CardContent } from '@material-ui/core';
import TitleBar from '../TitleBar'
import { debounce } from "debounce";

import { getResourceIcon, getActionIcon, getResourceIconLabel } from '../../../model/resource-icon';
import { isEntryEditable, isCheckedOutRemote } from '../../../model/FairCopyProject'
import { canCheckOut, canCreate, canDelete } from '../../../model/permissions'
import { ellipsis } from '../../../model/ellipsis'

const idealNameLength = 35
const idealPanelWidth = 1172

export default class ResourceBrowser extends Component {

  constructor(props) {
    super(props)

    this.initialState = {
      filterBuffer: ''
    }
    this.state = this.initialState

    this.updateNameFilter = debounce((nameFilter) => {
      this.props.onResourceViewChange({ nameFilter })
    }, 100)
}

  onOpenActionMenu = (anchorEl) => {
    const { onOpenPopupMenu, fairCopyProject, currentView } = this.props
    const { remote: remoteProject, permissions } = fairCopyProject
    const loggedIn = fairCopyProject.isLoggedIn()
    const checkout = remoteProject ? canCheckOut(permissions) : true
    const del = remoteProject ? canDelete(permissions) : true

    const remoteProjectOptions = !remoteProject || !loggedIn ? [] : [
      {
        id: 'check-in',
        label: 'Check In',
        action: this.createResourceAction('check-in')
      },
      {
        id: 'check-out',
        label: 'Check Out',
        action: this.createResourceAction('check-out'),
        disabled: !checkout
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
        id: 'export',
        label: 'Export',
        action: this.createResourceAction('export')
      },
      {
        id: 'delete',
        label: 'Delete',
        action: this.createResourceAction('delete'),
        disabled: !del
      }
    ]

    // move only works with local resources 
    if( currentView === 'home' ) {
      menuOptions.push({
        id: 'move',
        label: 'Move',
        action: this.createResourceAction('move')   
      })     
    }

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

  renderFilterInput() {

    const onChange = (e) => {
      const {value} = e.target
      this.setState({ ...this.state, filterBuffer: value })
      const nameFilter = value.length > 0 ? value : 'null'
      this.updateNameFilter(nameFilter)
    }

    const onClearFilter = () => {
      this.setState({ ...this.state, filterBuffer: '' })
      this.updateNameFilter(null)
    }

    const { filterBuffer } = this.state

    return <div className='filter-input'>
            <Input 
                name="filter-input"
                className="filter-input"
                size="small"
                margin="dense"
                autoFocus={true}
                disableUnderline={true}
                onChange={onChange}
                aria-label="Filter resource list"
                placeholder="Type to filter list" 
                value={filterBuffer}
                endAdornment={
                  <Tooltip title="Clear Name Filter">
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="clear name filter"
                        onClick={onClearFilter}
                      >
                        <i className="fas fa-times-circle fa-sm"></i>
                      </IconButton>
                    </InputAdornment>
                  </Tooltip>
                }
            />
          </div>
  }

  renderToolbar() {
    const { onEditResource, teiDoc, onImportResource, onEditTEIDoc, currentView, resourceCheckmarks, fairCopyProject } = this.props
    const { remote: remoteProject, permissions } = fairCopyProject
    const createAllowed = remoteProject ? canCreate(permissions) : true
    const canPreview = !fairCopyProject.remote || (fairCopyProject.remote && fairCopyProject.isLoggedIn())

    const buttonProps = {
      className: 'toolbar-button',
      variant: "outlined",
      size: 'small'
    }

    const onImportXML = () => { onImportResource('xml') }
    const onImportIIIF = () => { onImportResource('iiif') }
    const onPreviewResource = () => { fairCopyProject.previewResource(teiDoc) }
    const actionsEnabled = Object.values(resourceCheckmarks).find( c => !!c )

    return (
      <div className="toolbar">
        { currentView === 'home' && 
          <div className='inline-button-group'>
            <Button disabled={!createAllowed} onClick={onEditResource} {...buttonProps}>New Resource</Button>    
            <Button disabled={!createAllowed} onClick={onImportXML} {...buttonProps}>Import Texts</Button>    
            <Button disabled={!createAllowed} onClick={onImportIIIF} {...buttonProps}>Import IIIF</Button>              
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
        { teiDoc &&
          <Tooltip title="Preview Published Document">
              <span>
                  <Button
                      disabled={!canPreview}
                      onClick={onPreviewResource}
                      className='toolbar-button'
                      disableRipple={true}
                      disableFocusRipple={true}
                      style={{float: 'right'}}
                  >
                      <i className="far fa-eye fa-2x"></i>
                  </Button>                   
              </span>
          </Tooltip>   
        }
        { !teiDoc && this.renderFilterInput() }
      </div>
    )
  }

  renderSortableHeaderCell(key,label,orderBy,order) {

    const createSortHandler = (nextOrderBy, nextOrder) => {      
      return () => {
        this.props.onResourceViewChange({ orderBy: nextOrderBy, order: nextOrder })  
      }
    } 
    const sortDirection = order === 'ascending' ? 'asc' : 'desc'

    return <TableCell sortDirection={orderBy === key ? sortDirection : false}>
              <TableSortLabel
                active={orderBy === key}
                direction={orderBy === key ? sortDirection : 'asc'}
                onClick={createSortHandler(key, order === 'ascending' ? 'descending' : 'ascending')}
              >
                {label}
              </TableSortLabel>
            </TableCell>
  }

  renderResourceTable() {
    const { onResourceAction, fairCopyProject, resourceView, panelWidth, resourceIndex, currentView, resourceCheckmarks, allResourcesCheckmarked } = this.props
    const { remote: remoteProject, userID } = fairCopyProject
    const { currentPage, rowsPerPage, totalRows, orderBy, order } = resourceView

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
      const editable = isEntryEditable( resource, userID )
      const checkedOutRemote = !editable ? isCheckedOutRemote( resource, userID ) : false
      const { label, icon } = getActionIcon( false, local, editable|deleted, checkedOutRemote )
      const lastModified = !editable ? new Date(resource.lastAction.created_at).toDateString() : ''
      const textClass = deleted ? 'deleted-resource' : ''
      const iconClass = deleted ? 'deleted-icon' : ''
      const widthFactor = panelWidth >= idealPanelWidth ? 1 : (panelWidth/idealPanelWidth)*0.6
      const maxNameLength = Math.floor(idealNameLength * widthFactor)
      const displayName = ellipsis( name, maxNameLength )
      const displayLocalID = ellipsis( localID, maxNameLength )
      
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
            <Typography title={name} className={textClass}>{displayName}</Typography>
          </TableCell>
          <TableCell {...cellProps} >
            <Typography title={localID} className={textClass}>{displayLocalID}</Typography>
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
      this.props.onResourceViewChange({ currentPage: page+1 })
    }

    const tableCaption = currentView === 'home' ? 'This table lists the resources on your computer.' : 'This table lists the resources on the server.'
  
    return (
          <TableContainer className="table-container">
              <Table stickyHeader size="small" >
                  <caption>{tableCaption}</caption>
                  <TableHead>
                      <TableRow>
                          <TableCell ><Checkbox onClick={toggleAll} color="default" checked={allResourcesCheckmarked} /></TableCell>
                          { remoteProject && <TableCell><i className="fa fa-pen fa-lg"></i></TableCell> }
                          <TableCell>Type</TableCell>
                          { this.renderSortableHeaderCell('name','Name',orderBy,order) }
                          { this.renderSortableHeaderCell('localID','ID',orderBy,order) }
                          { remoteProject && <TableCell>Last Modified</TableCell> }
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      { resourceRows }
                  </TableBody>
              </Table>
              <TablePagination
              component="div"
              rowsPerPageOptions={[rowsPerPage]}
              count={totalRows}
              rowsPerPage={rowsPerPage}
              page={currentPage-1}
              onPageChange={onChangePage}
            />
          </TableContainer>
  )
  }

  renderEmptyListMessage() {
    const { resourceIndex, currentView, fairCopyProject, resourceView, onLogin } = this.props
    const { filterBuffer } = this.state
    if( resourceIndex.length > 0 || resourceView.loading ) return null

    const buttonProps = {
      className: 'login-button',
      variant: "outlined",
      size: 'small'
    }
    const displayLoginButton = !fairCopyProject.isLoggedIn() && currentView === 'remote'

    let message
    if( filterBuffer.length > 0 ) {
      message = <Typography>No resources match the filter.</Typography>
    } else {
      message = currentView === 'home' ? 
        <Typography>There are no local resources. Click on the <i className="fa fa-home-alt"></i> icon to see resources on the server.</Typography> :
        displayLoginButton ? 
            <Typography>You are not logged into the server. Click below to login.</Typography> :
            <Typography>There are no remote resources. On the <i className="fa fa-home-alt"></i> Local page, you can create or import new resources to add to your project.</Typography>    
    }

    return (
      <Card raised={true} className='empty-list-card'>
        <CardContent>
          { message }
          { displayLoginButton && <Button onClick={onLogin} {...buttonProps}>Login</Button>}
        </CardContent>
      </Card>
    )
  }

  render() {
      const { width, teiDoc, fairCopyProject, onResourceAction, resourceView, currentView } = this.props
      const { loading } = resourceView
      const { isLoggedIn, remote: remoteProject } = fairCopyProject

      // reset the filter when switching views
      const onResourceActionFilter = (actionID, resourceIDs, resourceEntries) => {
        if( actionID === 'remote' || actionID === 'home' ) {
          this.setState(this.initialState)
        }
        onResourceAction(actionID, resourceIDs, resourceEntries)
      }

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <TitleBar parentResource={teiDoc} onResourceAction={onResourceActionFilter} isLoggedIn={isLoggedIn} remoteProject={remoteProject} currentView={currentView} loading={loading}></TitleBar>
          { this.renderToolbar() }
          <main>
              { this.renderResourceTable() }
              { remoteProject && this.renderEmptyListMessage() }
          </main>
        </div>
      )
  }

}

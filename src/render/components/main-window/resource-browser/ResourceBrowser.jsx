import React, { Component } from 'react';
import { Button, Card, Chip, InputAdornment, IconButton, TableContainer, TableSortLabel, Table, Input, TableHead, TableRow, TableCell, TableBody, TablePagination, Tooltip, Checkbox, Typography, CardContent, withStyles } from '@material-ui/core';
import { Autorenew, Edit, MoreVert, Publish } from '@material-ui/icons';
import TitleBar from '../TitleBar'
import { debounce } from "debounce";

import { getResourceIcon, getActionIcon, getResourceIconLabel } from '../../../model/resource-icon';
import { isEntryEditable, isCheckedOutRemote } from '../../../model/FairCopyProject'
import { canAbandonOtherUsersResources, canAbandonOwnResource, canCheckOut, canCreate, canDelete, isAdmin } from '../../../model/permissions'
import { ellipsis } from '../../../model/ellipsis'

const idealNameLength = 35
const idealPanelWidth = 1172
const maxDocTitleLength = 64

const fairCopy = window.fairCopy

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

  onOpenActionMenu = (anchorEl, resource) => {
    const { currentView, fairCopyProject, onOpenPopupMenu, resourceCheckmarks, teiDoc } = this.props
    const { permissions, remote: remoteProject, userID } = fairCopyProject
    const loggedIn = fairCopyProject.isLoggedIn()
    const del = remoteProject ? canDelete(permissions) : true

    // list of non-null selected items so we can do .some() or .every() on them
    const resources = resource ? [resource] : Object.values(resourceCheckmarks).filter(Boolean);
    const checkedOutByUser = resources.some(
      (r) =>
        r.lastAction?.action_type === 'check_out' &&
        r.lastAction.user?.id === userID,
    )
    const someCheckedIn = resources.some((r) => r.lastAction?.action_type !== 'check_out')
    const someDeleted = resources.some((r) => r.deleted)
    const allDeleted = resources.every((r) => r.deleted)
    const menuOptions = []

    // TODO: collapse Remote and Local into a single view. for now, check them separately
    const atRemoteProjectRoot = remoteProject && loggedIn && !teiDoc;
    if (atRemoteProjectRoot) {
      // checkin/checkout only in remote project, at the project root, when we are logged in
      if (currentView === 'home' || checkedOutByUser) {
        // can check in if we are in Local, or we're in Remote but user has something checked out
        menuOptions.push({
          id: 'check-in',
          label: 'Check In',
          action: this.createResourceAction('check-in', resource)
        })
      }
      if (currentView === 'remote' && canCheckOut(permissions) && someCheckedIn) {
        // can only check out from Remote
        menuOptions.push({
          id: 'check-out',
          label: 'Check Out',
          action: this.createResourceAction('check-out', resource),
        })
      }
    }

    menuOptions.push({
      id: 'export',
      label: 'Export',
      action: this.createResourceAction('export', resource)
    })

    // move only works with local resources, and not at the project root
    if (currentView === 'home' && teiDoc) {
      menuOptions.push({
        id: 'move',
        label: 'Move',
        action: this.createResourceAction('move', resource)
      })
    }

    // if the resource is checked out by someone else, can abandon checkout
    const isAbandonable = resource?.lastAction?.action_type === 'check_out' &&
      resource.lastAction.user?.id !== userID
    const showAbandon = canAbandonOtherUsersResources(permissions) && isAbandonable && atRemoteProjectRoot && currentView === 'remote'
    if (showAbandon) {
      menuOptions.push({
        id: 'abandon',
        label: 'Unlock',
        classes: 'danger',
        action: this.createResourceAction('abandon', resource),
      })
    }

    // can also abandon checkout if the resource is checked out by the current user
    const showRevert = canAbandonOwnResource(permissions, resource, userID) && atRemoteProjectRoot
    if (showRevert) {
      menuOptions.push({
        id: 'revert',
        label: 'Revert',
        classes: 'danger',
        action: this.createResourceAction('revert', resource),
      })
    }

    if (del && !allDeleted && !showAbandon) {
      menuOptions.push({
        id: 'delete',
        label: 'Delete',
        classes: 'danger',
        action: this.createResourceAction('delete', resource),
      })
    }

    // you can recover deleted items when logged out
    if (remoteProject && someDeleted) {
      menuOptions.push({
        id: 'recover',
        label: 'Recover',
        action: this.createResourceAction('recover', resource)
      })
    }
    
    onOpenPopupMenu(menuOptions, anchorEl)
  }

  createResourceAction(actionID, resource) {    
    return () => {
      const { onResourceAction, resourceCheckmarks } = this.props
      const resourceIDs = [], resourceEntries = []
      if (resource) {
        resourceIDs.push(resource.id)
        resourceEntries.push(resource)
      } else {
        for( const resourceID of Object.keys(resourceCheckmarks) ) {
          const resourceEntry = resourceCheckmarks[resourceID]
          if( resourceEntry ) {
            resourceIDs.push(resourceEntry.id)
            resourceEntries.push(resourceEntry)
          }
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
    const { onEditResource, teiDoc, onImportResource, onEditTEIDoc, currentView, resourceCheckmarks, fairCopyProject, publishingResources, resourceView } = this.props
    const { remote: remoteProject, permissions, userID } = fairCopyProject
    const createAllowed = remoteProject ? canCreate(permissions) : true
    const canPreview = !fairCopyProject.remote || (fairCopyProject.remote && fairCopyProject.isLoggedIn())
    const { loading } = resourceView;

    const buttonProps = {
      className: 'toolbar-button',
      variant: 'contained',
      size: 'small'
    }

    const onImportXML = () => { onImportResource('xml') }
    const onImportIIIF = () => { onImportResource('iiif') }
    const onPreviewResource = () => { fairCopyProject.previewResource(teiDoc) }
    const onPublishResource = () => { fairCopy.ipcSend('publish', teiDoc) }
    const onCopyPublishedLink= () => { fairCopyProject.copyPublishedLinkToClipboard(teiDoc) }
    const actionsEnabled = Object.values(resourceCheckmarks).find( c => !!c )
    const atRemoteDoc = remoteProject && currentView === 'remote' && teiDoc
    const editable = teiDoc && isEntryEditable(teiDoc, userID)
    const checkedOut = teiDoc && (editable || isCheckedOutRemote(teiDoc, userID))
    const canPublish = teiDoc?.status?.is_draft && !checkedOut && !teiDoc.status.is_processing
    let publishTooltip = "Publish"
    if (!canPublish) {
      if (!teiDoc?.status?.is_draft) {
        publishTooltip = "Document must have a draft checked in to publish"
      } else if (checkedOut) {
        publishTooltip = "Document must be checked in to publish"
      } else {
        publishTooltip = "Document must finish processing before it can be published"
      }
    }
    const docActionType = teiDoc?.lastAction?.action_type;
    const datePublished = docActionType === 'publish' ? new Date(teiDoc.lastAction.created_at).toDateString() : null;
    const dateCheckedIn = ['update', 'create'].includes(docActionType) ? new Date(teiDoc.lastAction.created_at).toDateString() : null;    

    return (
      <div className="toolbar-container">
        { teiDoc &&
          <div className="doc-header">
            <div className="doc-header-left">
              <Tooltip title={teiDoc.name}>
                <Typography component="h2" variant="h6">{ellipsis(teiDoc.name, maxDocTitleLength)}</Typography>
              </Tooltip>
              {currentView === 'home' && 
                <Tooltip title="Edit Document Properties">
                  <IconButton
                    onClick={onEditTEIDoc}
                    className='toolbar-button'
                  >
                    <i className='fa fa-pen-to-square fa-md' />
                  </IconButton>
                </Tooltip>
              }
              {atRemoteDoc &&
                <>
                  {teiDoc.status?.is_published && (
                    <Tooltip title={datePublished ? `Last published: ${datePublished}` : "Published"} arrow>
                      <StatusChip label="Published" icon={<i className="fa fa-file-circle-check"></i>} size="small" color="primary" />
                    </Tooltip>
                  )}
                  {teiDoc.status?.is_draft && (
                    <Tooltip title={dateCheckedIn ? `Draft checked in: ${dateCheckedIn}` : "Draft"} arrow>
                      <StatusChip label="Draft" icon={<Edit />} size="small" color="secondary" />
                    </Tooltip>
                  )}
                  {teiDoc.status?.is_processing && (
                    <Tooltip title="Document is currently being processed" arrow>
                      <StatusChip label="Processing" icon={<Autorenew />} size="small" color="default" />
                    </Tooltip>
                  )}
                </>
              }
            </div>
            <div className="doc-header-right">
              {atRemoteDoc && isAdmin(permissions) &&
                <Tooltip title={publishTooltip} arrow>
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!canPublish || loading || publishingResources}
                      onClick={onPublishResource}
                      startIcon={<Publish />}
                    >
                      Publish
                    </Button>
                  </span>
                </Tooltip>
              }
              <Tooltip title="Preview Published Document">
                <span className="iconbutton-wrapper">
                  <IconButton
                    aria-label="Preview Published Document"
                    disabled={!canPreview}
                    onClick={onPreviewResource}
                    className='toolbar-button'
                  >
                    <i className='fa fa-eye fa-md' />
                  </IconButton>
                </span>
              </Tooltip>
              { remoteProject && <Tooltip title="Copy IIIF Manifest Link to Clipboard">
                <span className="iconbutton-wrapper">
                  <IconButton
                    aria-label="Copy IIIF Manifest Link to Clipboard"
                    disabled={!teiDoc.status?.is_published}
                    onClick={onCopyPublishedLink}
                    className='toolbar-button'
                  >
                    <i className='fa fa-link fa-md' />
                  </IconButton>
                </span>
              </Tooltip> }
            </div>
          </div>
        }
        <div className='toolbar'>
          <Typography component="h2" variant="h6">
            {teiDoc ? "Resources" : "Documents"}
          </Typography>
          <div className='tools'>
            { currentView === 'home' && 
              <div className='inline-button-group'>
                <Button color="primary" disabled={!createAllowed} onClick={onEditResource} {...buttonProps}>Add New</Button>
                <Button color="primary" disabled={!createAllowed} onClick={onImportXML} {...buttonProps}>
                  {teiDoc ? "Import Text" : "Import TEI"}
                </Button>
                <Button color="primary" disabled={!createAllowed} onClick={onImportIIIF} {...buttonProps}>Import IIIF</Button>
              </div>
            }
            <Button 
              disabled={!actionsEnabled}
              ref={(el)=> { this.actionButtonEl = el }}
              onClick={()=>{this.onOpenActionMenu(this.actionButtonEl)}}         
              {...buttonProps}
              color='primary'
              variant='outlined'
            >Actions<i className='down-caret fas fa-caret-down fa-lg'></i></Button>
            { !teiDoc && this.renderFilterInput() }
          </div>
        </div>
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
    const { onResourceAction, fairCopyProject, resourceView, panelWidth, resourceIndex, currentView, resourceCheckmarks, allResourcesCheckmarked, teiDoc } = this.props
    const { remote: remoteProject, userID } = fairCopyProject
    const { currentPage, rowsPerPage, totalRows, orderBy, order } = resourceView
    const atRemoteRoot = remoteProject && currentView !== 'home' && !teiDoc

    const onOpen = (resourceID) => {
      const resource = resourceIndex.find(resourceEntry => resourceEntry.id === resourceID )
      if( resource.deleted ) return
      if( resource.type === 'teidoc' ) {
        this.setState(this.initialState)
      } 
      onResourceAction( 'open', [resourceID] )         
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
          { remoteProject && !teiDoc && 
          <TableCell {...cellProps} align="center">
            { icon && 
              <Tooltip title={label}>
                { typeof icon === "string" ?
                  <i aria-label={label} className={`${icon} ${iconClass} fa-lg`}></i>
                  : React.createElement(icon, { "aria-label": label, "aria-hidden": false, className: iconClass })
                }
              </Tooltip>
            }
          </TableCell>
          }
          { teiDoc &&
            <TableCell {...cellProps} >
              <i aria-label={getResourceIconLabel(type)} className={`${resourceIcon} ${iconClass} fa-lg`}></i>
            </TableCell>
          }
          <TableCell {...cellProps} >
            <Typography title={name} className={textClass}>{displayName}</Typography>
          </TableCell>
          <TableCell {...cellProps} >
            <Typography title={localID} className={textClass}>{displayLocalID}</Typography>
          </TableCell>
          { remoteProject && !teiDoc &&
          <TableCell {...cellProps} >
            <Typography className={textClass}>{lastModified}</Typography>
          </TableCell>
          }
          { atRemoteRoot &&
            <>
              <TableCell {...cellProps} align="center" >
                {resource.status?.is_draft && (
                    <Edit aria-label="Draft" />
                )}
              </TableCell>
              <TableCell {...cellProps} align="center" >
                {resource.status?.is_published && (
                    <i aria-label="Published" className="fa fa-file-circle-check"></i>
                )}
              </TableCell>
            </>
          }
          <TableCell {...cellProps} >
            <IconButton
              aria-label="Actions"
              disabled={resourceView.loading}
              onClick={(event) => {
                event.stopPropagation()
                this.onOpenActionMenu(event.target, resource)
              }}
            >
              <MoreVert />
            </IconButton>
          </TableCell>
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
                          { remoteProject && !teiDoc && <TableCell align="center">Checked Out</TableCell> }
                          { teiDoc && <TableCell>Type</TableCell> }
                          { this.renderSortableHeaderCell('name','Name',orderBy,order) }
                          { this.renderSortableHeaderCell('localID','ID',orderBy,order) }
                          { remoteProject && !teiDoc && <TableCell>Last Modified</TableCell> }
                          { atRemoteRoot && <TableCell>Draft</TableCell> }
                          { atRemoteRoot && <TableCell>Published</TableCell> }
                          <TableCell aria-label="Actions" />
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
      const { width, teiDoc, fairCopyProject, onResourceAction, resourceView, currentView, resourceIndex, onCheckInAll } = this.props
      const { loading } = resourceView
      const { isLoggedIn, remote: remoteProject, permissions } = fairCopyProject

      // reset the filter when switching views
      const onResourceActionFilter = (actionID, resourceIDs, resourceEntries) => {
        if( actionID === 'remote' || actionID === 'home' ) {
          this.setState(this.initialState)
        }
        onResourceAction(actionID, resourceIDs, resourceEntries)
      }

      const canCheckInAll = resourceIndex.length > 0 && remoteProject && canCheckOut(permissions)

      return (
        <div id="ResourceBrowser" style={{width: width ? width : '100%'}}>
          <TitleBar
            canCheckInAll={canCheckInAll}
            currentView={currentView}
            isLoggedIn={isLoggedIn}
            loading={loading}
            onCheckInAll={onCheckInAll}
            onResourceAction={onResourceActionFilter}
            parentResource={teiDoc}
            remoteProject={remoteProject}
          ></TitleBar>
          { this.renderToolbar() }
          <main>
              { this.renderResourceTable() }
              { remoteProject && this.renderEmptyListMessage() }
          </main>
        </div>
      )
  }

}

export const StatusChip = withStyles((theme) => ({
  root: {
    paddingLeft: 4,
    paddingRight: 4,
    '&.yellow': {
      backgroundColor: theme.palette.yellow.main,
    },
    '&.yellow .MuiChip-iconSmall': {
      color: theme.palette.text.primary,
      marginLeft: 6,
      marginTop: 4,
      marginRight: -8,
    }
  },
  colorPrimary: {
    backgroundColor: theme.palette.success.dark,
  },
  colorSecondary: {
    backgroundColor: theme.palette.info.dark,
  },
  iconColorPrimary: {
    marginLeft: 6,
    marginTop: 4,
  }
}))(React.forwardRef((props, ref) => <Chip {...props} ref={ref} />))

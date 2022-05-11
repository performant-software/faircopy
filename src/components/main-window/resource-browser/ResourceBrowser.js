import React, { Component } from 'react';
import { Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, TablePagination, Tooltip, Checkbox } from '@material-ui/core';
import TitleBar from '../TitleBar'
import { getResourceIcon, getResourceIconLabel } from '../../../model/resource-icon';
import { checkForUpdates } from '../../../model/resource-index-view';

const rowsPerPage = 100

export default class ResourceBrowser extends Component {

  constructor() {
    super()
    this.initialState = {
      allChecked: false,
      currentPage: 0,
      checked: {}
    }
    this.state = this.initialState
  }

  componentDidMount() {
    const { fairCopyProject, teiDoc } = this.props
    const { currentPage } = this.state

    // TODO start polling for changes to resource page
    checkForUpdates( fairCopyProject, teiDoc, currentPage, rowsPerPage, this.refreshView, (error) => {
      // TODO snack alert?
      console.log(error)
    } ) 
  }

  componentWillUnmount() {
    // TODO stop update polling
  }

  refreshView = () => {
    this.setState({...this.state})
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
        id: 'check-in',
        label: 'Check In',
        action: this.createResourceAction('check-in')
      },
      {
        id: 'check-out',
        label: 'Check Out',
        action: this.createResourceAction('check-out')
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
    const { onResourceAction, fairCopyProject } = this.props
    const { resourceIndexView, remote: remoteProject, isEditable } = fairCopyProject

    const onOpen = (resourceID) => {
      const resource = resourceIndexView.find(resourceEntry => resourceEntry.id === resourceID )
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
      for( const resource of resourceIndexView ) {
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

    const { checked, allChecked, currentPage } = this.state
    
    const resourceRows = []
    for( const resource of resourceIndexView ) {
      if( !resource ) continue
      const check = checked[resource.id] === true
      const resourceIcon = getResourceIcon(resource.type)
      const status = resource.remote ? 'online' : 'local' 
      const editable = isEditable( resource.id )
      const lastModified = ''
      
      resourceRows.push(
        <TableRow hover onClick={onClick} onKeyUp={onKeyUp} dataresourceid={resource.id} key={`resource-${resource.id}`}>
          <TableCell {...cellProps} >
            <Checkbox onClick={onClickCheck} disabled={resource.type === 'header'} dataresourceid={resource.id} color="default" checked={check} />
          </TableCell>
          { remoteProject && 
          <TableCell {...cellProps} >
           { editable && <i className="fa fa-pen fa-lg"></i> }
          </TableCell>
          }
          <TableCell {...cellProps} >
            <i aria-label={getResourceIconLabel(resource.type)} className={`${resourceIcon} fa-lg`}></i>
          </TableCell>
          <TableCell {...cellProps} >
            {resource.name}
          </TableCell>
          <TableCell {...cellProps} >
            {resource.localID}
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
                          <TableCell><i className="fa fa-pen fa-lg"></i></TableCell>
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

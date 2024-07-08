import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'
import { TextField, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';
import { getActionIcon } from '../../../model/resource-icon'
import { inlineRingSpinner } from '../../common/ring-spinner'

import { isEntryEditable } from '../../../model/FairCopyProject'

const cellProps = {
    component: "td",
    scope: "row"
}

const fairCopy = window.fairCopy

export default class CheckInDialog extends Component {

    constructor(props) {
        super()
        this.initialState = {
            message: "",
            committedResources: [],
            status: 'ready',
            resourceStatus: null,
            errorMessage: null
        }
        this.state = this.initialState
    }

    componentDidMount() {
        fairCopy.ipcRegisterCallback('checkInResults', this.onCheckInResults )
    }

    componentWillUnmount() {
        fairCopy.ipcRemoveListener('checkInResults', this.onCheckInResults )
    }

    getResourcesToCommit() {
        const { checkInResources, localResources } = this.props
        let resourcesToCommit = []
        for( const resourceID of checkInResources ) {
            const resource = localResources[resourceID]
            // ignore resources that aren't checked out
            if( resource ) {
                const { id: resourceID, type: resourceType, deleted } = resource                
                if( resourceType === 'teidoc' ) {
                    // commit any checked out children, delete if parent is deleted
                    for( const checkedOutResource of Object.values(localResources) ) {
                        if( resourceID === checkedOutResource.parentResource ) {                            
                            if( deleted ) checkedOutResource.deleted = true
                            resourcesToCommit.push(checkedOutResource) 
                        }
                    }
                }
                resourcesToCommit.push(resource)    
            }
        }
        return resourcesToCommit
    }

    onCheckInResults = (event, checkInResult) => {
        const { resourceEntries, resourceStatus, error } = checkInResult
        if( error ) {
            this.setState({...this.state, committedResources: resourceEntries, resourceStatus, status: 'done', errorMessage: error })
        } else {
            this.setState({...this.state, committedResources: resourceEntries, resourceStatus, status: 'done', errorMessage: null })
        }
    }

    renderResourceTable() {
        const { fairCopyProject } = this.props
        const { committedResources, resourceStatus, status } = this.state
        const resourcesToCommit = this.getResourcesToCommit()
        const responseReceived = status === 'done'
        const resourceList = responseReceived ? committedResources : resourcesToCommit
        const resources = resourceList.sort((a, b) => a.name.localeCompare(b.name))
        
        const resourceRows = []
        for( const resource of resources ) {
            const { id: resourceID, type: resourceType, local, deleted, localID, name } = resource
            // don't display header entries
            if( resourceType === 'header' ) continue
            const resourceStatusCode = resourceStatus ? resourceStatus[resourceID] : null
            const resourceStatusMessage = getResourceStatusMessage(resourceStatusCode)
            const editable = isEntryEditable(resource, fairCopyProject.userID)
            let { icon, label } = getActionIcon(responseReceived, local, editable )
            if( deleted ) icon = 'fa-trash'

            resourceRows.push(
                <TableRow key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        <i aria-label={label} className={`fa ${icon} fa-lg`}></i>
                    </TableCell>
                    <TableCell {...cellProps} >
                        <Typography>{name}</Typography>
                    </TableCell>
                    <TableCell {...cellProps} >
                        <Typography>{localID}</Typography>
                    </TableCell>
                    <TableCell {...cellProps} >
                        <Typography>{resourceStatusMessage}</Typography>
                    </TableCell>
                </TableRow>
            )            
        }

        const caption = status === 'done' ? 'These resources have been processed.' : 'These resources are ready to be checked in.'

        return (
            <div>
                <TableContainer className="table-container">
                    <Table stickyHeader size="small" >
                        <caption>{caption}</caption>
                        <TableHead>
                            <TableRow>
                                <TableCell>Action</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>ID</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            { resourceRows }
                        </TableBody>
                    </Table>
                </TableContainer>               
            </div>
        )
    }

    onCheckIn = () => {              
        const { fairCopyProject } = this.props
        const { userID, serverURL, projectID } = fairCopyProject
        const { message } = this.state   
        const resourcesToCommit = this.getResourcesToCommit()

        if( message.length > 0 ) {
            const resourceIDs = resourcesToCommit.map( r => r.id )
            this.setState({ ...this.state, status: 'loading' }) 
            fairCopy.ipcSend('checkIn', userID, serverURL, projectID, resourceIDs, message )   
        } else {
            this.setState({ ...this.state, errorMessage: "Please provide a commit message." })
        }
    }

    renderCommitField() {
        const { message } = this.state

        const onChangeMessage = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, message: value })
        }

        return (
            <TextField 
                autoFocus
                className="commit-message-field"
                label="Commit Message" 
                helperText="Briefly describe these changes."
                onChange={onChangeMessage}
                value={message}
            />
        )
    }

    renderErrorMessage() {
        const { errorMessage } = this.state
        if( !errorMessage ) return null
        return (
            <Typography className="error-message">{errorMessage}</Typography>
        )
    }

    render() {
        const { onClose } = this.props
        const { status } = this.state

        const checkInButtonProps = status === 'ready' ? {  variant: "contained", color: "primary", onClick: this.onCheckIn } : 
            {  variant: "outlined", color: "default", enabled: 'false' } 
        const closeButtonProps = status === 'done' ? {  variant: "contained", color: "primary", onClick: onClose } : 
            status === 'loading' ?  {  variant: "outlined", color: "default", enabled: 'false' } : 
                                    {  variant: "outlined", color: "default", onClick: onClose }
        
        return (
            <Dialog
                id="CheckInDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="checkin-dialog-title"
            >
                <DialogTitle id="checkin-dialog-title">Check In Resources { status === 'loading' && inlineRingSpinner('dark') }</DialogTitle>
                <DialogContent className="checkin-panel">
                   { this.renderCommitField() }
                   { this.renderResourceTable() }
                   { this.renderErrorMessage() }
                </DialogContent>
                <DialogActions>
                    <Button {...checkInButtonProps} >Check In</Button>
                    <Button {...closeButtonProps} >{ status === 'ready' ? 'Cancel' : 'Done' }</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

function getResourceStatusMessage(resourceStatusCode) {
    switch(resourceStatusCode) {
        case 'ok':
            return 'OK'
        case 'not_authorized':
            return 'Not Authorized'
        case 'teidoc_deletion_with_children':
            return 'Cannot delete w/children checked out.'
        case 'not_checked_out':
            return 'Not checked out.'
        case 'not_found':
            return 'Not found.'
        case null:
            return ''
        default:
            return 'unknown status code'
    }
}
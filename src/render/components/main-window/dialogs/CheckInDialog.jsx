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

// maximum number of resources per batch
const batchSizeLimit = 50

const fairCopy = window.fairCopy

export default class CheckInDialog extends Component {

    constructor(props) {
        super()
        this.initialState = {
            message: "",
            committedResources: [],
            status: 'ready',
            resourceStatus: {},
            errorMessage: null,
            resourcesToCommit: [],
            batchesComplete: 0,
        }
        this.state = this.initialState
    }

    componentDidMount() {
        fairCopy.ipcRegisterCallback('checkInResults', this.onCheckInResults )
        // perform resouce batching on mount
        this.setState((prevState) => ({
            ...prevState,
            resourcesToCommit: this.getResourcesToCommit(),
        }))
    }

    componentWillUnmount() {
        fairCopy.ipcRemoveListener('checkInResults', this.onCheckInResults )
    }

    getResourcesToCommit() {
        const { checkInResources, localResources } = this.props

        // group resources into batches of max size batchSizeLimit, without separating TEI docs
        // from child resources.
        // resourcesToCommit is a 2D array of batches.
        let resourcesToCommit = []
        let currentBatch = []

        for( const resourceID of checkInResources ) {
            const resource = localResources[resourceID]
            // ignore resources that aren't checked out
            if (!resource) continue
            
            const { id, type, deleted } = resource

            // ensure TEI docs are grouped with their child resources
            let resourceGroup = [resource]

            if( type === 'teidoc' ) {
                // commit any checked out children, delete if parent is deleted
                for( const checkedOutResource of Object.values(localResources) ) {
                    if( id === checkedOutResource.parentResource ) {                            
                        if( deleted ) checkedOutResource.deleted = true
                        resourceGroup.push(checkedOutResource) 
                    }
                }
            }

            const batchSize = currentBatch.length

            // prevent going over batchSizeLimit resources per batch (unless a single resource
            // group goes over the limit, in which case currentBatch is empty)
            if (batchSize !== 0 && batchSize + resourceGroup.length > batchSizeLimit) {
                // push batch to queue, create new batch
                resourcesToCommit.push(currentBatch)
                currentBatch = []
            }

            // add all resources from resources group to current batch
            currentBatch.push(...resourceGroup)
        }
        // push last batch if non-empty
        if (currentBatch.length > 0) {
            resourcesToCommit.push(currentBatch)
        }
        return resourcesToCommit
    }

    onCheckInResults = (event, checkInResult) => {
        const { resourceEntries, resourceStatus, error } = checkInResult
        this.setState((prevState) => {
            // when we get new results message back, concat previous committed resources list with new one
            const committedResources = prevState.committedResources.concat(resourceEntries)
            // update number of batches complete to get status
            const totalBatches = prevState.resourcesToCommit.length
            const batchesComplete = prevState.batchesComplete + 1
            return {
                committedResources,
                batchesComplete,
                status: batchesComplete === totalBatches ? 'done' : 'loading',
                resourceStatus: { ...prevState.resourceStatus, ...resourceStatus },
                errorMessage: error || prevState.error || null
            }
        })
    }

    renderResourceTable() {
        const { fairCopyProject } = this.props
        const { committedResources, resourceStatus, resourcesToCommit, status } = this.state
        const allResourcesToCommit = resourcesToCommit.flat()
        const committedDocuments = committedResources.filter((resource) => resource.type === 'teidoc')
        const allDocuments = allResourcesToCommit.filter((resource) => resource.type === 'teidoc')
        const responseReceived = ['loading', 'done'].includes(status)
        const resources = responseReceived ? committedDocuments : allDocuments

        const resourceRows = []
        for( const resource of resources ) {
            const { id: resourceID, local, deleted, localID, name } = resource
            const resourceStatusCode = Object.keys(resourceStatus).length ? resourceStatus[resourceID] : null
            const resourceStatusMessage = getResourceStatusMessage(resourceStatusCode)
            const editable = isEntryEditable(resource, fairCopyProject.userID)
            let { icon, label } = getActionIcon(responseReceived, local, editable )
            if( resourceStatusCode && resourceStatusCode !== 'ok' ) icon = 'fa fa-x'
            if( deleted ) icon = 'fa fa-trash'
            if( local ) icon = 'fa fa-cloud-arrow-up'

            resourceRows.push(
                <TableRow key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        { typeof icon === "string" ?
                            <i aria-label={label} className={`${icon} fa-lg`}></i>
                            : React.createElement(icon, { "aria-label": label, "aria-hidden": false })
                        }
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

        const totalDocuments = allDocuments.length
        const caption = responseReceived
            ? `${committedDocuments.length}/${totalDocuments} documents have been processed.`
            : `${totalDocuments} documents are ready to be checked in.`

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
        const { message, resourcesToCommit } = this.state

        if( message.length > 0 ) {
            this.setState({ ...this.state, status: 'loading' })
            const resourceIDBatches = resourcesToCommit.map((batch) => batch.map(r => r.id))
            fairCopy.ipcSend('checkIn', userID, serverURL, projectID, resourceIDBatches, message)
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

    renderCheckInAll() {
        const { committedResources, status, resourcesToCommit } = this.state
        const allResourcesToCommit = resourcesToCommit.flat()
        const committedDocumentCount = committedResources.filter((resource) => resource.type === 'teidoc').length
        const totalDocuments = allResourcesToCommit.filter((resource) => resource.type === 'teidoc').length
        const caption = ['loading', 'done'].includes(status)
            ? `${committedDocumentCount}/${totalDocuments} documents have been processed.`
            : `${totalDocuments} documents are ready to be checked in.`
        return (
            <Typography>{caption}</Typography>
        )
    }

    render() {
        const { onClose, checkInAll } = this.props
        const { status } = this.state

        const checkInButtonProps = status === 'ready' ? {  variant: "contained", color: "primary", onClick: this.onCheckIn } :
            {  variant: "outlined", color: "default", disabled: true }
        const closeButtonProps = status === 'done' ? {  variant: "contained", color: "primary", onClick: onClose } :
            status === 'loading' ?  {  variant: "outlined", color: "default", disabled: true } :
                                    {  variant: "outlined", color: "default", onClick: onClose }

        return (
            <Dialog
                id="CheckInDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="checkin-dialog-title"
            >
                <DialogTitle id="checkin-dialog-title">Check In Documents { status === 'loading' && inlineRingSpinner('dark') }</DialogTitle>
                <DialogContent className="checkin-panel">
                   { this.renderCommitField() }
                   { !checkInAll && this.renderResourceTable() }
                   { checkInAll && this.renderCheckInAll() }
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
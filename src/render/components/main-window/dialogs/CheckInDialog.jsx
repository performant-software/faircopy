import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'
import { TextField, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';
import { getActionIcon } from '../../../model/resource-icon'

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
            errorMessage: null,
            resourcesToCommit: [],
        }
        this.state = this.initialState
    }

    componentDidMount() {
        // perform resouce batching on mount
        this.setState((prevState) => ({
            ...prevState,
            resourcesToCommit: this.getResourcesToCommit(),
        }))
    }

    getResourcesToCommit() {
        const { checkInResources, localResources, checkInPendingIDs } = this.props

        // group resources into batches of max size batchSizeLimit, without separating TEI docs
        // from child resources.
        // resourcesToCommit is a 2D array of batches.
        let resourcesToCommit = []
        let currentBatch = []

        for( const resourceID of checkInResources ) {
            const resource = localResources[resourceID]
            // ignore resources that aren't checked out or are already being checked in
            if (!resource || checkInPendingIDs?.has(resourceID)) continue
            
            const { id, type, deleted } = resource

            // ensure TEI docs are grouped with their child resources
            let resourceGroup = [resource]

            if( type === 'teidoc' ) {
                // commit any checked out children, delete if parent is deleted
                for( const checkedOutResource of Object.values(localResources) ) {
                    if( id === checkedOutResource.parentResource && !checkInPendingIDs?.has(checkedOutResource.id) ) {                            
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

    renderResourceTable() {
        const { fairCopyProject } = this.props
        const { resourcesToCommit } = this.state
        const allResourcesToCommit = resourcesToCommit.flat()
        const allDocuments = allResourcesToCommit.filter((resource) => resource.type === 'teidoc')

        const resourceRows = []
        for( const resource of allDocuments ) {
            const { local, deleted, localID, name } = resource
            const editable = isEntryEditable(resource, fairCopyProject.userID)
            let { icon, label } = getActionIcon(false, local, editable )
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
                </TableRow>
            )            
        }

        const caption = `${allDocuments.length} documents are ready to be checked in.`

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
        const { fairCopyProject, onClose } = this.props
        const { userID, serverURL, projectID } = fairCopyProject
        const { message, resourcesToCommit } = this.state

        if( message.length > 0 ) {
            const resourceIDBatches = resourcesToCommit.map((batch) => batch.map(r => r.id))
            // the check in proceeds in the background and the resources
            // are displayed as pending in the local project until each batch completes
            fairCopy.ipcSend('checkIn', userID, serverURL, projectID, resourceIDBatches, message)
            onClose()
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
        const { resourcesToCommit } = this.state
        const allResourcesToCommit = resourcesToCommit.flat()
        const totalDocuments = allResourcesToCommit.filter((resource) => resource.type === 'teidoc').length
        const caption = `${totalDocuments} documents are ready to be checked in.`
        return (
            <Typography>{caption}</Typography>
        )
    }

    render() {
        const { onClose, checkInAll } = this.props
        const { resourcesToCommit } = this.state

        const checkInButtonProps = resourcesToCommit.length > 0 ? {  variant: "contained", color: "primary", onClick: this.onCheckIn } :
            {  variant: "outlined", color: "default", disabled: true }

        return (
            <Dialog
                id="CheckInDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="checkin-dialog-title"
            >
                <DialogTitle id="checkin-dialog-title">Check In Documents</DialogTitle>
                <DialogContent className="checkin-panel">
                   { this.renderCommitField() }
                   { !checkInAll && this.renderResourceTable() }
                   { checkInAll && this.renderCheckInAll() }
                   { this.renderErrorMessage() }
                </DialogContent>
                <DialogActions>
                    <Button {...checkInButtonProps} >Check In</Button>
                    <Button variant="outlined" color="default" onClick={onClose} >Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}
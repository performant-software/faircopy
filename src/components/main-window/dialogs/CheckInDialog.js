import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'
import { TextField, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';
import { getActionIcon } from '../../../model/resource-icon'

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
            resourcesToCommit: [],
            committedResources: [],
            done: false,
            resourceStatus: null,
            errorMessage: null
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('checkedOutResources', this.onCheckedOutResources )
        services.ipcRegisterCallback('checkInResults', this.onCheckInResults )
        services.ipcSend('requestCheckedOutResources')
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('checkedOutResources', this.onCheckedOutResources )
        services.ipcRemoveListener('checkInResults', this.onCheckInResults )
    }

    onCheckedOutResources = (event,checkedOutResources) => {
        const { checkInResources } = this.props
        
        let resourcesToCommit = []
        for( const resourceID of checkInResources ) {
            const resource = checkedOutResources[resourceID]
            // ignore resources that aren't checked out
            if( resource ) {
                const { parentResource: parentID } = resource
                if( parentID ) {
                    const parentResource = checkedOutResources[parentID]
                    // add local parent resources if they aren't on the list
                    if( parentResource && parentResource.local && !resourcesToCommit.includes(parentResource) ) {
                        resourcesToCommit.push(parentResource)    
                    }
                }
                resourcesToCommit.push(resource)    
            }
        }
        this.setState({...this.state, resourcesToCommit })
    }

    onCheckInResults = (event,resourceEntries,resourceStatus,error) => {
        if( error ) {
            this.setState({...this.state, committedResources: resourceEntries, resourceStatus, done: false, errorMessage: error })
        } else {
            this.setState({...this.state, committedResources: resourceEntries, resourceStatus, done: true, errorMessage: null })
        }
    }

    renderResourceTable() {
        const { fairCopyProject } = this.props
        const { committedResources, resourcesToCommit, resourceStatus, error, done } = this.state

        const resourceList = done ? committedResources : error ? committedResources : resourcesToCommit
        const resources = resourceList.sort((a, b) => a.name.localeCompare(b.name))
        
        const resourceRows = resources.map( resource => { 
            const { id: resourceID, local, deleted, localID, name } = resource
            debugger
            const resourceStatusCode = resourceStatus ? resourceStatus[resourceID] : ''
            const editable = isEntryEditable(resource, fairCopyProject.email)
            let { icon, label } = getActionIcon(done, local, editable )
            if( deleted ) icon = 'fa-trash'

            return (
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
                        <Typography>{resourceStatusCode}</Typography>
                    </TableCell>
            </TableRow>
            )
        })

        const caption = done ? 'These resources have been checked in.' : 'These resources are ready to be checked in.'

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
        const { email, serverURL, projectID } = fairCopyProject
        const { message, resourcesToCommit } = this.state   
        const resourceIDs = resourcesToCommit.map( r => r.id )
        fairCopy.services.ipcSend('checkIn', email, serverURL, projectID, resourceIDs, message )
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
        const { done, message } = this.state

        const disabled = done || message.length === 0
        const closeButtonProps = done ? {  variant: "contained", color: "primary", onClick: onClose } : {  variant: "outlined", color: "default", onClick: onClose }

        return (
            <Dialog
                id="CheckInDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="checkin-dialog-title"
            >
                <DialogTitle id="checkin-dialog-title">Check In Resources</DialogTitle>
                <DialogContent className="checkin-panel">
                   { this.renderCommitField() }
                   { this.renderResourceTable() }
                   { this.renderErrorMessage() }
                </DialogContent>
                <DialogActions>
                    <Button disabled={disabled} variant="contained" color="primary" onClick={this.onCheckIn}>Check In</Button>
                    <Button {...closeButtonProps} >Done</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

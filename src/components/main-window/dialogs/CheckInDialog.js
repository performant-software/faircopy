import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'
import { TextField, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';
import { getActionIcon } from '../../../model/resource-icon'

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
            done: false,
            errorMessage: null
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('checkInResults', this.onCheckInResults )
        services.ipcRegisterCallback('checkInError', this.onCheckInError ) 
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('checkInResults', this.onCheckInResults )
        services.ipcRemoveListener('checkInError', this.onCheckInError  ) 
    }

    onCheckInResults = (event,resourceIDs) => {
        this.setState({...this.state, committedResources: resourceIDs, errorMessage: null })
    }

    onCheckInError = (event,error) => {
        this.setState({...this.state, committedResources: [], done: false, errorMessage: error })
    }

    renderResourceTable() {
        const { checkInResources, fairCopyProject } = this.props
        const { committedResources } = this.state

        const resourceRows = checkInResources.map( checkInResourceID => { 
            const resource = fairCopyProject.getResourceEntry(checkInResourceID)

            const { local, deleted, localID, name } = resource
            const checkedIn = committedResources.includes(checkInResourceID)
            const { icon, label } = getActionIcon(checkedIn, deleted, local, true )

            return (
                <TableRow key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        <i aria-label={label} className={`fa ${icon} fa-lg`}></i>
                    </TableCell>
                    <TableCell {...cellProps} >
                        {localID}
                    </TableCell>
                    <TableCell {...cellProps} >
                        {name}
                    </TableCell>
              </TableRow>
            )
        })

        return (
            <div>
                <TableContainer className="table-container">
                    <Table stickyHeader size="small" >
                        <caption>These resources are ready to be checked in.</caption>
                        <TableHead>
                            <TableRow>
                                <TableCell>Action</TableCell>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
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
        const { fairCopyProject, checkInResources } = this.props
        const { email, serverURL, projectID } = fairCopyProject
        const { message } = this.state

        const committedResources = checkInResources.map( resourceID => {
            const resourceEntry = fairCopyProject.resources[resourceID]
            const { id, local, deleted, name, localID, parentID, type } = resourceEntry
            const action = deleted ? 'destroy' : local ? 'create' : 'update'
            return {
                id,
                name,
                action,
                localID,
                parentID,
                resourceType: type
            }
        })
        
        fairCopy.services.ipcSend('checkIn', email, serverURL, projectID, JSON.stringify(committedResources), message )
        this.setState({...this.state, done: true})
    }

    renderCommitField() {
        const { message } = this.state

        const onChangeMessage = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, message: value })
        }

        return (
            <TextField 
                className="commit-message-field"
                label="Commit Message" 
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

        return (
            <Dialog
                id="CheckInDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="checkin-dialog-title"
            >
                <DialogTitle id="checkin-dialog-title">Check In</DialogTitle>
                <DialogContent>
                   { this.renderResourceTable() }
                   { this.renderCommitField() }
                   { this.renderErrorMessage() }
                </DialogContent>
                <DialogActions>
                    <Button disabled={disabled} variant="contained" color="primary" onClick={this.onCheckIn}>Check In</Button>
                    <Button variant="outlined" onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

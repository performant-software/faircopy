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
            checkedOutResources: null,
            committedResources: [],
            done: false,
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
        this.setState({...this.state, checkedOutResources })
    }

    onCheckInResults = (event,resourceIDs,error) => {
        if( error ) {
            this.setState({...this.state, committedResources: [], done: false, errorMessage: error })
        } else {
            this.setState({...this.state, committedResources: resourceIDs, errorMessage: null })
        }
    }

    renderResourceTable() {
        const { checkInResources, fairCopyProject } = this.props
        const { committedResources, checkedOutResources, done } = this.state

        let resources = checkedOutResources ? checkInResources.map( resourceID => checkedOutResources[resourceID] ) : []
        resources = resources.sort((a, b) => a.name.localeCompare(b.name))
        
        const resourceRows = resources.map( resource => { 
            const { id, local, deleted, localID, name } = resource
            const checkedIn = committedResources.includes(id)
            const editable = isEntryEditable(resource, fairCopyProject.email)
            const { icon, label } = getActionIcon(checkedIn, deleted, local, editable )

            return (
                <TableRow key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        <i aria-label={label} className={`fa ${icon} fa-lg`}></i>
                    </TableCell>
                    <TableCell {...cellProps} >
                        {name}
                    </TableCell>
                    <TableCell {...cellProps} >
                        {localID}
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
        fairCopy.services.ipcSend('checkIn', email, serverURL, projectID, checkInResources, message )
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

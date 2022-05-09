import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';

const cellProps = {
    component: "td",
    scope: "row"
}

const fairCopy = window.fairCopy

export default class CheckInDialog extends Component {

    constructor(props) {
        super()
        this.initialState = {
            message: "test commit message"
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('checkInResults', this.onCheckInResults )
        services.ipcRegisterCallback('checkInError', this.onCheckInError  ) 
    }

    componentWillUnmount() {
        const {services} = fairCopy

        services.ipcRemoveListener('checkInResults', this.onCheckInResults )
        services.ipcRemoveListener('checkInError', this.onCheckInError  ) 
    }

    onCheckInResults = (results) => {
        const  { onClose } = this.props
        // check_in_results: {
        //     status: enum
        //     Allowed: success failure
        //     The status of the check out operation
            
        //     resource_state: [{
        //     resource_guid: string
        //     The FairCopy GUID of the resource
            
        //     state: enum
        //     Allowed: create update destroy
        //     The requested action on the resource
            
        //     }]}
        console.log(results)
        onClose()
    }

    onCheckInError = (error) => {
        console.log(error)
    }

    renderResourceTable() {
        const { checkInResources, fairCopyProject } = this.props

        const resourceRows = checkInResources.map( checkInResourceID => { 
            const resource = fairCopyProject.resources[checkInResourceID]
            const action = 'C'
            return (
                <TableRow key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        {action}
                    </TableCell>
                    <TableCell {...cellProps} >
                        {resource.localID}
                    </TableCell>
                    <TableCell {...cellProps} >
                        {resource.name}
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
            const { id, localID, parentID, type } = resourceEntry
            const action = 'create'
            return {
                id,
                action,
                localID,
                parentID,
                resourceType: type
            }
        })
        
        fairCopy.services.ipcSend('checkIn', email, serverURL, projectID, JSON.stringify(committedResources), message )
    }

    render() {
        const { onClose } = this.props

        return (
            <Dialog
                open={true}
                onClose={onClose}
                aria-labelledby="checkin-dialog-title"
            >
                <DialogTitle id="checkin-dialog-title">Check In</DialogTitle>
                <DialogContent>
                   { this.renderResourceTable() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={this.onCheckIn}>Check In</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

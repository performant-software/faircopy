import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';

import { checkIn } from '../../../model/version-control';

const cellProps = {
    component: "td",
    scope: "row"
}

export default class CheckInDialog extends Component {

    constructor(props) {
        super()
        this.initialState = {
            message: ""
        }
        this.state = this.initialState
    }

    renderResourceTable() {
        const { checkInResources, fairCopyProject } = this.props

        const resourceRows = checkInResources.map( checkInResourceID => { 
            const resource = fairCopyProject.resources[checkInResourceID]
            const action = 'A'
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
        const { onClose, fairCopyProject, checkInResources } = this.props
        const { message } = this.state

        const onSuccess = () => {
            // TODO
            onClose()
        }

        const onFail = () => {
            // TODO
        }

        const commitedResources = checkInResources.map( resourceID => {
            const resourceEntry = fairCopyProject.resources[resourceID]
            const { id, localID, parentID, resourceType } = resourceEntry
            const action = ''
            return {
                id,
                action,
                localID,
                parentID,
                resourceType
            }
        })

        checkIn( fairCopyProject, commitedResources, message, onSuccess, onFail )
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

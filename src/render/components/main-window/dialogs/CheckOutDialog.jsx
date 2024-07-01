import React, { Component } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';

const cellProps = {
    component: "td",
    scope: "row"
}

export default class CheckOutDialog extends Component {

    renderResourceTable() {
        const { checkOutStatus } = this.props
        
        let successCount = 0
        const resourceRows = []
        for( const statusEntry of checkOutStatus ) {
            const { state, resourceEntry } = statusEntry
            const { id, name, type, localID } = resourceEntry
            if( type === 'header' ) continue
            const resourceStatusMessage = getResourceStatusMessage(state)
            if( state === 'success' ) successCount++

            resourceRows.push(
                <TableRow key={`resource-${id}`}>
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

        const s = successCount === 1 ? '' : 's'

        return (
            <div>
                <TableContainer className="table-container">
                    <Table stickyHeader size="small" >
                        <caption>Checked out {successCount} resource{s}.</caption>
                        <TableHead>
                            <TableRow>
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

    renderErrorMessage() {
        const { checkOutError } = this.props
        if( !checkOutError ) return null
        return (
            <Typography className="error-message">{checkOutError}</Typography>
        )
    }

    render() {
        const { onClose } = this.props
        
        return (
            <Dialog
                id="CheckOutDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="checkout-dialog-title"
            >
                <DialogTitle id="checkout-dialog-title"><i aria-label="Checked Out Icon" className={`fa fa-pen fa-sm`}></i> Checked Out Resources</DialogTitle>
                <DialogContent className="checkout-panel">
                   { this.renderResourceTable() }
                   { this.renderErrorMessage() }
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={onClose} >OK</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

function getResourceStatusMessage(resourceStatusCode) {
    switch(resourceStatusCode) {
        case 'success':
            return 'OK'
        case 'already_checked_out':
            return 'Already checked out.'
        case 'not_found':
            return 'Not found.'
        case null:
            return ''
        default:
            return 'unknown status code'
    }
}
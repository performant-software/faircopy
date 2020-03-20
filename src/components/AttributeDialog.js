import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button } from '@material-ui/core'


export default class AttributeDialog extends Component {

    renderTable() {
        const {elementName, teiDocument} = this.props
        const availableAttrs = teiDocument.getAvailableAttrs(elementName)

        const tableRows = []
        for( const attr of availableAttrs ) {
            tableRows.push(
                <TableRow key={`attr-row-${attr}`} >
                    <TableCell>{attr}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                </TableRow>    
            )
        }
        
        return (
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Notes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { tableRows }
                </TableBody>
            </Table>
        )
    }


    render() {
        const { open, onClose, elementName } = this.props

        return (
            <Dialog open={open} onClose={onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">Available Attributes for {elementName}</DialogTitle>
                <DialogContent>
                    { this.renderTable() }                    
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

}

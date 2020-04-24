import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button } from '@material-ui/core'


export default class VocabDialog extends Component {

    renderTable() {
        const { attrSpec } = this.props
        if( !attrSpec ) return null

        const { valList } = attrSpec

        const tableRows = []

        if( !valList ) {
            tableRows.push (
                <TableRow key={`attr-row-0`} >
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                </TableRow>                  
            )
        } else {
            for( const val of valList ) {
                tableRows.push(
                    <TableRow key={`attr-row-${val.ident}`} >
                        <TableCell>{val.ident}</TableCell>
                        <TableCell>{val.desc}</TableCell>
                    </TableRow>    
                )
            }    
        }
        
        return (
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                        </TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { tableRows }
                </TableBody>
            </Table>
        )
    }


    render() {
        const { open, onClose } = this.props

        return (
            <Dialog open={open} onClose={onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">Possible values for this attribute.</DialogTitle>
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

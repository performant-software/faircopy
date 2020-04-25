import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Typography } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button, InputBase, TextField } from '@material-ui/core'

import { teiDataWordValidator } from '../tei-document/attribute-validators'

export default class VocabDialog extends Component {

    // onChange = (e) => {
    //     const {value} = e.target
    //     const { onChangeCallback, minOccurs, maxOccurs } = this.props
    //     if( value !== "" && value !== null ) {
    //         const validState = teiDataWordValidator(value, minOccurs, maxOccurs)
    //         this.setState(validState)    
    //         onChangeCallback(value,validState.error)
    //     } else {
    //         this.setState({})
    //         onChangeCallback(value,false)
    //     }
    // }

    renderNameField() {

        // TODO
        // - combo box for selecting an existing vocab vs. creating a new one
        // - automatically given then name element[attrName]

        return (
            <TextField            
                label="Vocabulary Name"
                value="ref[type]"                        
                fullWidth={true}
            ></TextField>
        )
    }

    renderTable() {
        const { elementName, attrSpec, fairCopyConfig } = this.props
        if( !attrSpec ) return null
        // const { valList } = attrSpec

        const vocabID = fairCopyConfig.state.elements[elementName].attrState[attrSpec.ident].vocabID
        const vocab = fairCopyConfig.state.vocabs[vocabID]

        const tableRows = []

        // TODO
        // - record field input
        // - display validation errors
        // - add a new row
        // - internal scrolling for the table
        // - delete a row
        // - show a row is readonly

        for( const vocabEntry of vocab ) {
            const val = vocabEntry[0]
            const desc = vocabEntry[1]
            tableRows.push(
                <TableRow key={`attr-row-${val}`} >
                    <TableCell>
                        <InputBase
                            value={val}                        
                            fullWidth={true}
                        />      
                    </TableCell>
                    <TableCell>
                        <Typography>{desc}</Typography>
                    </TableCell>
                </TableRow>    
            )    
        }
        
        return (
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
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
                <DialogTitle id="attribute-dialog">Edit Vocabulary</DialogTitle>
                <DialogContent>
                    { this.renderNameField() }
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

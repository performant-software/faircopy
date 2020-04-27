import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Typography } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button, InputBase, TextField } from '@material-ui/core'

// import { teiDataWordValidator } from '../tei-document/attribute-validators'

export default class VocabDialog extends Component {

    constructor() {
        super()
        this.state = {
            vocabID: null,
            vocab: null
        }	
    }

    getVocab() {
        // if the vocab has been modified, use latest copy, otherwise use existing
        if( this.state.vocabID ) {
            return { vocabID: this.state.vocabID, vocab: this.state.vocab }
        } else {
            const { fairCopyConfig, elementName, attrName } = this.props
            return fairCopyConfig.getVocab( elementName, attrName )
        }
    }

    onCellChange = (e) => {
        const { vocab, vocabID } = this.getVocab()
        const {target} = e
        const {value} = target
        const cellIndex = parseInt(target.getAttribute('datacellidx'))
        vocab[cellIndex] = [ value, '']
        // TODO validate the change?
        this.setState({ ...this.state, vocab, vocabID })
    }

    onVocabChange = () => {
        // TODO
    }

    onSave = () => {
        const { onClose } = this.props
        // TODO pass vocab on to config
        this.setState({ ...this.state, vocabID: null, vocab: null })
        onClose()
    }

    onClose = () => {
        const { onClose } = this.props
        this.setState({ ...this.state, vocabID: null, vocab: null })
        onClose()
    }

    renderNameField() {
        const { vocabID } = this.getVocab()

        // TODO
        // - combo box for selecting an existing vocab vs. creating a new one

        return (
            <TextField            
                label="Vocabulary Name"
                value={vocabID}
                onChange={this.onVocabChange}                       
                fullWidth={true}
            ></TextField>
        )
    }

    renderTable() {
        // const { valList } = attrSpec
        const { vocab } = this.getVocab()

        // TODO
        // - record field input
        // - display validation errors
        // - add a new row
        // - internal scrolling for the table
        // - delete a row
        // - show a row is readonly

        let row = 0
        const tableRows = []
        for( const vocabEntry of vocab ) {
            const val = vocabEntry[0]
            const desc = vocabEntry[1]
            tableRows.push(
                <TableRow key={`attr-row-${row}`} >
                    <TableCell>
                        <InputBase
                            inputProps={{ 'datacellidx': row }}
                            value={val}                        
                            fullWidth={true}
                            onChange={this.onCellChange}
                        />      
                    </TableCell>
                    <TableCell>
                        <Typography>{desc}</Typography>
                    </TableCell>
                </TableRow>    
            )    
            row++
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
        const { open } = this.props
        if( !open ) return null

        return (
            <Dialog open={open} onClose={this.onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">Edit Vocabulary</DialogTitle>
                <DialogContent>
                    { this.renderNameField() }
                    { this.renderTable() }                    
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.onSave} color="primary">Save</Button>
                    <Button onClick={this.onClose} color="primary">Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

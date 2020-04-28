import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Typography } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button, IconButton, TextField } from '@material-ui/core'
import TEIDataWordField from './attribute-fields/TEIDataWordField';

// import { teiDataWordValidator } from '../tei-document/attribute-validators'

export default class VocabDialog extends Component {

    constructor() {
        super()
        this.state = {
            addMode: false,
            addTerm: '',
            addTermError: false,
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
            const v = fairCopyConfig.getVocab( elementName, attrName )
            return { vocab: [...v.vocab], vocabID: v.vocabID }
        }
    }

    onSave = () => {
        const { vocab, vocabID } = this.state
        const { onClose, fairCopyConfig } = this.props
        fairCopyConfig.setVocabState(vocabID, vocab)
        this.setState({ ...this.state, vocabID: null, vocab: null, addMode: false })
        onClose()
    }

    onClose = () => {
        const { onClose } = this.props
        this.setState({ ...this.state, vocabID: null, vocab: null, addMode: false })
        onClose()
    }

    renderNameField() {
        const { vocabID } = this.getVocab()

        const onVocabChange = () => {
            // TODO
        }
    
        // TODO
        // autocomplete existing name 
        // new button to create a new name, turns it into textfield

        return (
            <div className="vocab-name-field">
                <TextField          
                    label="Vocabulary Name"
                    value={vocabID}
                    onChange={onVocabChange}                       
                    fullWidth={true}
                ></TextField>
            </div>
        )
    }

    renderTable() {
        const { vocab, vocabID } = this.getVocab()
    
        const onCellDelete = (e) => {
            const {currentTarget} = e
            const cellIndex = parseInt(currentTarget.getAttribute('datacellidx'))
            const nextVocab = [ ...vocab ]
            nextVocab.splice(cellIndex,1)
            this.setState({ ...this.state, vocabID, vocab: nextVocab })
        }

        let row = 0
        const tableRows = []
        for( const vocabEntry of vocab ) {
            const val = vocabEntry[0]
            tableRows.push(
                <TableRow key={`attr-row-${row}`} >
                    <TableCell>
                        <Typography>{val}</Typography>
                    </TableCell>
                    <TableCell>
                        <IconButton   
                            datacellidx={row}                          
                            onClick={onCellDelete}
                        >
                            <i className="fas fa-minus-circle"></i>
                        </IconButton>
                    </TableCell>
                </TableRow>    
            )    
            row++
        }
        
        return (
            <Table stickyHeader size="small" >
                <TableHead>
                    <TableRow>
                        <TableCell>Value</TableCell>
                        <TableCell>Remove</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { tableRows }
                </TableBody>
            </Table>
        )
    }

    renderAddRow() {
        const onAddClick = () => this.setState({...this.state, addMode: true })
        
        const onCancelClick = () => {
            this.setState({...this.state, addTerm: '', addTermError: false, addMode: false })
        }
        
        const onChange = (value,error) => {
            // TODO run term through validator
            this.setState({...this.state, addTerm: value, addTermError: error })
        }

        const onSaveClick = () => {
            const { addTerm, addTermError } = this.state    
            if( !addTermError ) {
                // add this term to to vocab
                const v = this.getVocab()
                const nextVocab = [ ...v.vocab, [addTerm,true]]
                this.setState({...this.state, vocab: nextVocab, vocabID: v.vocabID, addTerm: '', addTermError: false, addMode: false })
            } 
        }

        const { addMode, addTerm, addTermError } = this.state

        if( addMode ) {
            return (
                <div className="vocab-add-row">
                    <TEIDataWordField
                        attrName="new term"
                        value={addTerm}                        
                        onChangeCallback={onChange}
                    />
                    <IconButton 
                        onClick={onSaveClick} 
                        disabled={addTermError}
                        tooltip={"Save Term"}
                    >
                        <i className="fas fa-check-circle"></i>
                    </IconButton>
                    <IconButton 
                        onClick={onCancelClick} 
                        tooltip={"Cancel"}
                    >
                        <i className="fas fa-times-circle"></i>
                    </IconButton>
                </div>
            )    
        } else {
            return (
                <div className="vocab-add-row">
                    <Button 
                        onClick={onAddClick} 
                        tooltip={"Add a Term"}
                    >
                        <span><i className="fas fa-lg fa-plus-circle"></i> Add Term</span>
                    </Button>
                </div>
            )    
        }
    }

    render() {
        const { open } = this.props
        if( !open ) return null

        return (
            <Dialog id="VocabDialog" maxWidth="lg" open={open} onClose={this.onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">Edit Vocabulary</DialogTitle>
                <DialogContent className="vocab-content">
                    { this.renderNameField() }
                    { this.renderTable() }
                    { this.renderAddRow() }                   
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.onSave} color="primary">Save</Button>
                    <Button onClick={this.onClose} color="primary">Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

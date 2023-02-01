import React, { Component } from 'react'

import { Button, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { Table, TableContainer, TableBody, TableCell, TableRow, TableHead, Paper } from '@material-ui/core'
import {recordKeyCombination} from 'react-hotkeys'

import ElementMenu from "../main-window/tei-editor/ElementMenu"

export default class KeyBindingDialog extends Component {

    constructor(props) {
        super(props)

        const { selectedKeybinding } = this.props
        const elementType = selectedKeybinding ? selectedKeybinding.elementType : 'mark'
        const elementName = selectedKeybinding ? selectedKeybinding.elementName : null
        const title = selectedKeybinding ? "Edit Keybinding" : "New Keybinding"

        this.state = {
            title,
            chord: selectedKeybinding?.chord,
            recordingChord: false,
            elementType,
            elementName,
            elementMenuOptions: null
        }
        this.elementMenuAnchors = {}
    }

    renderChordField() {
        const { recordingChord } = this.state

        const onClick = () => {
            recordKeyCombination( (e) => {
                const {id: chord} = e
                this.setState({...this.state, chord, recordingChord: false })
            })
            this.setState({...this.state, recordingChord: true })
        }
        
        return (
            <Button
                variant={recordingChord ? 'contained' : 'outlined'}
                className="keystroke-record-button"
                onClick={onClick}
            >
                <i className="record-icon fas fa-square"></i> Record Keystroke   
            </Button>
        )
    }

    renderElementField() {
        const { elementType, elementName } = this.state

        const onClick = () => {
            this.setState({...this.state, elementMenuOptions: { menuGroup: 'mark' } })
        }

        const icon = elementType === 'mark' ? <i className="fas fa-marker"></i> : <i className="fas fa-stamp"></i>
        const elementButtonLabel = elementName ? <span>{ icon } { elementName }</span> : <span>Choose Element</span>

        return (
            <Button
                className="element-field"
                size="small"
                variant="contained"
                onClick={onClick}
                ref = { (el)=> { this.elementMenuAnchors.mark = el } }
            >
                { elementButtonLabel }                
            </Button>
        )
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, elementMenuOptions: null })
    }

    renderElementMenu() {
        const { fairCopyConfig, teiSchema } = this.props
        const { elementMenuOptions } = this.state

        if(!elementMenuOptions) return null

        const { menus } = fairCopyConfig
        const { elements } = teiSchema
        
        const onAction = (elementID) => {
            this.setState({ ...this.state, elementName: elementID, elementMenuOptions: null })
        }

        return (
            <ElementMenu
                menus={menus}
                elements={elements}
                onClose={ () => {
                    this.setState({...this.state, elementMenuOptions: null })
                } }
                elementMenuAnchors={this.elementMenuAnchors}
                onAction={onAction}
                validAction={() => { return true }}
                onExited={() => {}}
                {...elementMenuOptions}
            ></ElementMenu>
        )
    }

    render() {      
        const { onClose, onSave } = this.props
        const { title, chord, elementType, elementName } = this.state

        const onClickSave = () => {
            onSave(chord, elementType, elementName)
        }

        // TODO: add a place for "keystroke already assigned message"
        const chordLabel = chord ? chord.toUpperCase() : 'Unassigned'

        return (
            <Dialog
                id="KeyBindingDialog"
                open={true}
                aria-labelledby="keybinding-title"
            >
                <DialogTitle id="keybinding-title">{ title }</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="a table of keybindings for <mark> and inline elements">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Keystroke</TableCell>
                                    <TableCell>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow> 
                                    <TableCell>{ chordLabel }</TableCell>
                                    <TableCell><Typography>Add a {this.renderElementField()} element.</Typography></TableCell>
                                </TableRow>                            
                            </TableBody>
                        </Table>
                    </TableContainer>                    
                    { this.renderChordField() }
                </DialogContent>
                <DialogActions>
                    <Button disabled={ !chord || !elementName } variant="contained" color="primary" onClick={onClickSave}>Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
                { this.renderElementMenu() }
            </Dialog>
        )
    }

}

import React, { Component } from 'react'
import { Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Paper, Typography } from '@material-ui/core'
import { Tooltip, IconButton, Button } from '@material-ui/core'
import { getElementTypeIcon } from '../../model/TEISchema'

import KeyBindingDialog from './KeyBindingDialog'

export default class KeyBindingsTable extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedKeybinding: null,
            keybindingDialog: false
        }
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig, readOnly } = this.props
        const { selectedKeybinding, keybindingDialog } = this.state
        const { keybindings } = fairCopyConfig

        const onAddKeybinding = () => {
            this.setState({ ...this.state, keybindingDialog: true })
        }

        const keyRows = []
        for( const chord of Object.keys(keybindings) ) {
            const keybinding = keybindings[chord]
            const { elementType, elementName } = keybinding

            const onEdit = () => {
                this.setState({ ...this.state, selectedKeybinding: keybinding, keybindingDialog: true })
            }
    
            const onDelete = () => {
                delete fairCopyConfig.keybindings[chord]
                onUpdateConfig(fairCopyConfig)
            }
            
            keyRows.push(
                <TableRow
                    key={chord}
                >
                    <TableCell component="th" scope="row">
                        <Typography>{chord}</Typography>
                    </TableCell>
                    <TableCell>
                        <Typography>Add a <i className={getElementTypeIcon(elementType)}></i> {elementName} element.</Typography>
                    </TableCell>
                    <TableCell>
                        { !readOnly && <Tooltip title="Edit this keybinding."><IconButton onClick={onEdit}><i className="fas fa-edit fa-sm"></i></IconButton></Tooltip> }
                        { !readOnly && <Tooltip title="Remove this keybinding."><span><IconButton onClick={onDelete}><i className="fas fa-trash fa-sm"></i></IconButton></span></Tooltip> }
                    </TableCell>
                </TableRow>
            )
        }
        
        const onClose = () => {
            this.setState({ ...this.state, keybindingDialog: false })
        }

        const onSave = (chord, elementType, elementName) => {
            keybindings[chord] = { elementType, elementName }
            onUpdateConfig(fairCopyConfig)
            onClose()
        }

        return (
            <div id="KeyBindingsTable">
                <Typography variant="h4">Keybindings</Typography>
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="a table of keybindings for <mark> and inline elements">
                        <TableHead>
                        <TableRow>
                            <TableCell>Keystroke</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                            { keyRows }
                        </TableBody>
                    </Table>
                </TableContainer>
                { !readOnly && <Button variant='contained' onClick={onAddKeybinding}>Add Keybinding</Button> }
                { keybindingDialog && <KeyBindingDialog
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    selectedKeybinding={selectedKeybinding}
                    onSave={onSave}
                    onClose={onClose}
                ></KeyBindingDialog>}
            </div>
        )
    }
}
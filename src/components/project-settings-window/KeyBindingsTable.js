import React, { Component } from 'react'
import { Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Paper, Typography } from '@material-ui/core'
import { Tooltip, IconButton, Button } from '@material-ui/core'
import { getElementTypeIcon } from '../../model/TEISchema'
import { teiEditorKeyMap } from '../../model/editor-keybindings'

import KeyBindingDialog from './KeyBindingDialog'

export default class KeyBindingsTable extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedAction: null,
            selectedKey: null,
            keybindingDialog: false
        }
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig, readOnly } = this.props
        const { selectedAction, selectedKey, keybindingDialog } = this.state
        const { keybindings } = fairCopyConfig

        const chords = keybindings ? Object.keys(keybindings) : []
        const assignedKeys = [ ...chords.filter( key => key !== selectedKey ), ...Object.values(teiEditorKeyMap) ]

        const onAddKeybinding = () => {
            this.setState({ ...this.state, selectedAction: null, selectedKey: null, keybindingDialog: true })
        }

        const keyRows = []
        for( const chord of chords ) {
            const keybinding = keybindings[chord]
            const { elementType, elementName } = keybinding

            const onEdit = () => {
                this.setState({ ...this.state, selectedKey: chord, selectedAction: keybinding, keybindingDialog: true })
            }
    
            const onDelete = () => {
                delete fairCopyConfig.keybindings[chord]
                onUpdateConfig(fairCopyConfig)
            }
            
            const chordLabel = chord ? chord.toUpperCase() : 'Unassigned'

            keyRows.push(
                <TableRow
                    key={chord}
                >
                    <TableCell component="th" scope="row">
                        <Typography>{chordLabel}</Typography>
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
            if( !fairCopyConfig.keybindings ) {
                fairCopyConfig.keybindings = {}
            }
            fairCopyConfig.keybindings[chord] = { elementType, elementName }
            onUpdateConfig(fairCopyConfig)
            onClose()
        }

        return (
            <div id="KeyBindingsTable">
                <Typography variant="h5">Hot Keys</Typography>
                <Typography className="explanation">Assign hotkeys and review assigned keys.</Typography>
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="a table of keybindings for mark and inline elements">
                        <TableHead>
                        <TableRow>
                            <TableCell>Keystroke</TableCell>
                            <TableCell>Description</TableCell>
                            { !readOnly && <TableCell>Actions</TableCell> }
                        </TableRow>
                        </TableHead>
                        <TableBody>
                            { keyRows }
                        </TableBody>
                    </Table>
                </TableContainer>
                { !readOnly && <Button variant='contained' className='add-keybinding-button' onClick={onAddKeybinding}>Add Hotkey</Button> }
                { keybindingDialog && <KeyBindingDialog
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    assignedKeys={assignedKeys}
                    selectedAction={selectedAction}
                    selectedKey={selectedKey}
                    onSave={onSave}
                    onClose={onClose}
                ></KeyBindingDialog>}
            </div>
        )
    }
}
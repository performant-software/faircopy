import React, { Component } from 'react'
import { Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Paper, Typography } from '@material-ui/core'
import { Tooltip, IconButton } from '@material-ui/core'

export default class KeyBindingsTable extends Component {

    constructor(props) {
        super(props)

        this.state = {
        }
    }

    render() {
        const { fairCopyConfig, onUpdateConfig, readOnly } = this.props

        const keybindings = {
            'alt+space': {
                elementType: 'mark',
                elementName: "persName"
            }
        }

        const keyRows = []
        for( const chord of Object.keys(keybindings) ) {
            const { elementType, elementName } = keybindings[chord]

            const onEdit = () => {
                // ... 
            }
    
            const onDelete = () => {
                // TODO clear the value of this key binding
            }
            
            keyRows.push(
                <TableRow
                    key={chord}
                >
                    <TableCell component="th" scope="row">
                        <Typography>{chord}</Typography>
                    </TableCell>
                    <TableCell>
                        { getElementTypeIcon(elementType) }
                    </TableCell>
                    <TableCell>
                        <Typography>{elementName}</Typography>
                    </TableCell>
                    <TableCell>
                        <Tooltip title="Edit this hot key."><IconButton onClick={onEdit}><i className="fas fa-edit fa-sm"></i></IconButton></Tooltip>
                        <Tooltip title="Remove this hot key."><span><IconButton onClick={onDelete}><i className="fas fa-trash fa-sm"></i></IconButton></span></Tooltip>                    
                    </TableCell>
                </TableRow>
            )
        }

        return (
            <div id="KeyBindingsTable">
                <Typography variant="h4">Keybindings</Typography>
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="a table of keybindings for mark and inline elements">
                        <TableHead>
                        <TableRow>
                            <TableCell>Keystroke</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Element</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                            { keyRows }
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        )
    }
}

function getElementTypeIcon( elementType ) {
    if( elementType === 'mark' ) {
        return <i className="fas fa-marker"></i>
    } else {
        return <i className="fas fa-stamp"></i> 
    }
}
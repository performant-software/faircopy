import React, { Component } from 'react'
import { Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Paper, Typography } from '@material-ui/core'
import { Tooltip, IconButton, Button } from '@material-ui/core'

import ColorCodingDialog from './ColorCodingDialog'

export const colorCodingColors = { blue: '#0187a8', red: '#a80101', green: '#01a801', purple: '#8101a8', black: '#000000' }

export default class ColorCodingTable extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedElement: null,
            selectedColor: null,
            colorCodingDialog: false
        }
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig, readOnly } = this.props
        const { selectedElement, selectedColor, colorCodingDialog } = this.state
        const { colorCodings } = fairCopyConfig

        const assignedElements = Object.keys(colorCodings)

        const onAddColorCoding = () => {
            this.setState({ ...this.state, selectedElement: null, selectedColor: null, colorCodingDialog: true })
        }

        const colorCodingRows = []
        for( const elementName of assignedElements ) {
            const color = colorCodings[elementName]

            const onEdit = () => {
                this.setState({ ...this.state, selectedElement: elementName, selectedColor: color, keybindingDialog: true })
            }
    
            const onDelete = () => {
                delete fairCopyConfig.colorCodings[elementName]
                onUpdateConfig(fairCopyConfig)
            }
            
            colorCodingRows.push(
                <TableRow
                    key={elementName}
                >
                    <TableCell component="th" scope="row">
                        { renderColorBlock(color) }
                    </TableCell>
                    <TableCell>
                        <Typography>{elementName}</Typography>
                    </TableCell>
                    <TableCell>
                        { !readOnly && <Tooltip title="Edit this color code."><IconButton onClick={onEdit}><i className="fas fa-edit fa-sm"></i></IconButton></Tooltip> }
                        { !readOnly && <Tooltip title="Remove this color code."><span><IconButton onClick={onDelete}><i className="fas fa-trash fa-sm"></i></IconButton></span></Tooltip> }
                    </TableCell>
                </TableRow>
            )
        }
        
        const onClose = () => {
            this.setState({ ...this.state, colorCodingDialog: false })
        }

        const onSave = (elementName, color) => {
            fairCopyConfig.colorCodings[elementName] = color
            onUpdateConfig(fairCopyConfig)
            onClose()
        }

        return (
            <div id="ColorCodingPanel">
                <Typography variant="h5">Color Coding</Typography>
                <Typography className="explanation">Assign color codes.</Typography>
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="a table of color codes for mark elements">
                        <TableHead>
                        <TableRow>
                            <TableCell>Color</TableCell>
                            <TableCell>Element</TableCell>
                            { !readOnly && <TableCell>Actions</TableCell> }
                        </TableRow>
                        </TableHead>
                        <TableBody>
                            { colorCodingRows }
                        </TableBody>
                    </Table>
                </TableContainer>
                { !readOnly && <Button variant='contained' className='add-colorcode-button' onClick={onAddColorCoding}>Add Color Code</Button> }
                { colorCodingDialog && <ColorCodingDialog
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    assignedElements={assignedElements}
                    color={selectedColor}
                    elementName={selectedElement}
                    onSave={onSave}
                    onClose={onClose}
                ></ColorCodingDialog>}
            </div>
        )
    }
}

export function renderColorBlock(color) {
    const backgroundColor = colorCodingColors[color]
    return (
        <div className="color-block" style={{backgroundColor}}></div>
    )
}
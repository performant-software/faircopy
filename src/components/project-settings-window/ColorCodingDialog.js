import React, { Component } from 'react'

import { Button, MenuItem, Select, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { Table, TableContainer, TableBody, TableCell, TableRow, TableHead, Paper } from '@material-ui/core'

import ElementMenu from "../main-window/tei-editor/ElementMenu"
import { colorCodingColors } from '../../model/faircopy-config'
import { renderColorBlock} from './ColorCodingTable'

export default class ColorCodingDialog extends Component {

    constructor(props) {
        super(props)

        const { color, elementName } = this.props
        const title = color ? "Edit Color Coding" : "New Color Coding"

        this.state = {
            title,
            color: color ? color : 'blue',
            elementName,
            elementMenuOptions: null,
            errorMessage: null
        }
        this.elementMenuAnchors = {}
    }

    renderColorField() {
        const { color } = this.state

        const onChange = (event) => {
            this.setState({ ...this.state, color: event.target.value })
        }

        const menuItems = Object.keys(colorCodingColors).map( colorName => {
            return <MenuItem value={colorName} key={`cc-${colorName}`}>
                {renderColorBlock(colorName)} { colorName }
            </MenuItem>
        })

        return <Select
            name="color-code"
            value={color}
            onChange={onChange}
            aria-label="Color Code"
            variant="outlined"
        >
            { menuItems }
        </Select>
    }

    renderElementField() {
        const { elementName } = this.state

        if( elementName === '__default__' ) {
            return "Default Color"
        } else {
            const onClick = () => {
                this.setState({...this.state, elementMenuOptions: { menuGroup: 'mark' } })
            }
    
            const elementButtonLabel = elementName ? <span><i className="fas fa-marker"></i> { elementName }</span> : <span>Choose Element</span>
    
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
        const { title, color, elementName, errorMessage } = this.state

        const onClickSave = () => {
            onSave(elementName, color)
        }

        return (
            <Dialog
                id="ColorCodingDialog"
                open={true}
                aria-labelledby="colorcoding-title"
            >
                <DialogTitle id="colorcoding-title">{ title }</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="a table of color codings for mark elements">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Color</TableCell>
                                    <TableCell>Element</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow> 
                                    <TableCell>{ this.renderColorField() }</TableCell>
                                    <TableCell><Typography>{this.renderElementField()}</Typography></TableCell>
                                </TableRow>                            
                            </TableBody>
                        </Table>
                    </TableContainer>    
                    { errorMessage && <Typography className='error-message'>{ errorMessage }</Typography> }           
                </DialogContent>
                <DialogActions>
                    <Button disabled={ !color || !elementName } variant="contained" color="primary" onClick={onClickSave}>Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
                { this.renderElementMenu() }
            </Dialog>
        )
    }
}
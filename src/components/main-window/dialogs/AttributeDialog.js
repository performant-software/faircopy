import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Typography } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button, Checkbox } from '@material-ui/core'

export default class AttributeDialog extends Component {

    renderTable() {
        const {elementName, teiSchema, fairCopyConfig, onUpdateConfig} = this.props
        const {elements} = fairCopyConfig
        const {attrState} = elements[elementName]

        const tableRows = []
        for( const attrName of Object.keys(attrState) ) {
            const attr = teiSchema.getAttrSpec( attrName, elementName )
    
            if( !attr.hidden ) {
                const onChange = () => {
                    const active = !attrState[attrName].active
                    fairCopyConfig.elements[elementName].attrState[attrName] = { ...attrState[attrName], active }
                    onUpdateConfig(fairCopyConfig)
                }
            
                tableRows.push(
                    <TableRow key={`attr-row-${attrName}`} >
                        <TableCell>
                          <Checkbox
                                color="primary"
                                checked={attrState[attrName].active}
                                onChange={onChange}
                            />
                        </TableCell>
                        <TableCell>{attrName}</TableCell>
                        <TableCell>{attr.description}</TableCell>
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
                        <TableCell>Name</TableCell>
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
        const { open, onClose, elementName } = this.props

        if( !elementName ) return null
        const displayName = elementName.startsWith('mark') ? elementName.slice('mark'.length) : elementName

        return (
            <Dialog open={open} onClose={onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">Available Attributes for {displayName}</DialogTitle>
                <DialogContent>
                    <Typography>Select attributes to describe this element. These attributes will appear for every instance of {displayName}.</Typography>
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

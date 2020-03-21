import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button, Checkbox } from '@material-ui/core'


export default class AttributeDialog extends Component {

    renderTable() {
        const {elementName, teiDocument} = this.props
        const {attrs, elements} = teiDocument.teiSchema
        const {attrState} = elements[elementName]

        const tableRows = []
        for( const attrName of Object.keys(attrState) ) {
            const attr = attrs[attrName]
    
            const onChange = () => {
                const active = !attrState[attrName].active
                teiDocument.setAttrState(elementName, attrName, { active })
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
        
        return (
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <Checkbox
                                color="primary"
                                checked={false}
                                onChange={() => {}}
                            />
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

        return (
            <Dialog open={open} onClose={onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog">Available Attributes for {elementName}</DialogTitle>
                <DialogContent>
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

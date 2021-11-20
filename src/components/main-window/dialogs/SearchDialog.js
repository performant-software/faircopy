import React, { Component } from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Typography, Tooltip } from '@material-ui/core'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@material-ui/core'
import { Button, IconButton, TextField } from '@material-ui/core'

export default class SearchDialog extends Component {

    constructor() {
        super() 
        this.initialState = {
            elementName: '',
            attrQs: [],
            addMode: false,
            attrName: '',
            attrValue: '',
            changed: false
        }	
        this.state = this.initialState	
    }

    getSearchFilterOptions() {
        const { changed } = this.state
        const { searchFilterOptions } = this.props
        
        if( !changed && searchFilterOptions ) {
            const { elementName, attrQs } = searchFilterOptions
            return { elementName, attrQs }
        } else {
            const { elementName, attrQs } = this.state
            return { elementName, attrQs }
        }
    }

    renderElementFilter() {
        const { elementName, attrQs } = this.getSearchFilterOptions()

        const onChange = (e) => {
            const {value} = e.target
            this.setState( { ...this.state, changed: true, elementName: value, attrQs })
        }
    
        return (
            <div className="search-name-field">
                <TextField          
                    label="Element Name"
                    aria-label="Element Name"
                    value={elementName}
                    onChange={onChange}                       
                    fullWidth={true}
                ></TextField>
            </div>
        )
    }

    renderAttributeFilters() {
        const { elementName, attrQs } = this.getSearchFilterOptions()
    
        const onAttrDelete = (e) => {
            const {currentTarget} = e
            const rowIndex = parseInt(currentTarget.getAttribute('datacellidx'))
            const nextAttrQs = [ ...attrQs ]
            nextAttrQs.splice(rowIndex,1)
            this.setState({ ...this.state, attrQs: nextAttrQs, elementName, changed: true  })
        }

        let row = 0
        const tableRows = []
        for( const attrQ of attrQs ) {
            const { name, value } = attrQ
            tableRows.push(
                <TableRow key={`attr-row-${row}`} >
                   <TableCell>
                        <Typography>{name}</Typography>
                    </TableCell>
                    <TableCell>
                        <Typography>{value}</Typography>
                    </TableCell>
                    <TableCell align="right">
                        <IconButton   
                            datacellidx={row}                          
                            onClick={onAttrDelete}
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
                        <TableCell>Name</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell align="right" ></TableCell>
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
        const resetState = { attrName: '', attrValue: '', addMode: false }
        
        const onCancelClick = () => {
            this.setState({...this.state, ...resetState })
        }
        
        const onChange = (e) => {
            const { attrName, attrValue } = this.state
            const {name, value} = e.target
            const nextAttrName = name === 'attrName' ? value : attrName
            const nextAttrValue = name === 'attrValue' ? value : attrValue
            this.setState({...this.state, attrName: nextAttrName, attrValue: nextAttrValue })
        }

        const onSaveClick = () => {
            const { attrName, attrValue } = this.state    
            if( !attrName || attrName === '' ) {
                // don't add blank terms
                this.setState({...this.state, ...resetState })
            } else {
                const { elementName, attrQs } = this.getSearchFilterOptions()
                const nextAttrQs = [ ...attrQs, { name: attrName, value: attrValue }]
                this.setState({ ...this.state, ...resetState, elementName, attrQs: nextAttrQs, changed: true  })    
            }
        }

        const { addMode, attrName, attrValue } = this.state

        if( addMode ) {
            return (
                <div className="search-add-row">
                    <TextField
                        name="attrName"
                        aria-label="Attribute Name"
                        className="attr-filter-name"
                        value={attrName}            
                        onChange={onChange}
                    />
                    <TextField
                        name="attrValue"
                        aria-label="Attribute Value"
                        value={attrValue}            
                        onChange={onChange}
                    />
                    <Tooltip title="Save Attribute Filter">
                        <IconButton aria-label="Save Atrribute Filter" onClick={onSaveClick} >
                            <i className="fas fa-check-circle"></i>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel Attribute Filter">
                        <IconButton aria-label="Cancel Attribute Filter" onClick={onCancelClick} >
                            <i className="fas fa-times-circle"></i>
                        </IconButton>
                    </Tooltip>
                </div>
            )    
        } else {
            return (
                <div className="search-add-row">
                    <Button 
                        onClick={onAddClick} 
                        tooltip={"Add an attribute filter."}
                    >
                        <span><i className="fas fa-lg fa-plus-circle"></i> Add Attribute Filter</span>
                    </Button>
                </div>
            )    
        }
    }

    render() {
        const { onClose, updateSearchFilter } = this.props

        const onOK = () => {
            const { elementName, attrQs, changed } = this.state
            if( changed ) {
                const trimName = elementName.trim()
                const active = trimName.length > 0 || attrQs.length > 0 
                updateSearchFilter(trimName, attrQs, active, false)    
            } else {
                onClose()
            }
            this.setState({ ...this.initialState })
        }

        const onReset = () => {
            this.setState({ ...this.initialState, changed: true })
        }

        const onCancel = () => {
            this.setState({ ...this.initialState })
            onClose()
        }

        return (
            <Dialog id="SearchDialog" maxWidth="lg" open={true} onClose={this.onClose} aria-labelledby="attribute-dialog">
                <DialogTitle id="attribute-dialog"><i className="fas fa-filter"></i> Search Filters</DialogTitle>
                <DialogContent className="vocab-content">
                    <Typography>You can limit your search to certain element types and/or attribute values.</Typography>
                    { this.renderElementFilter() }
                    { this.renderAttributeFilters() }         
                    { this.renderAddRow() }          
                </DialogContent>
                <DialogActions>
                    <Button onClick={onReset} color="primary">Reset</Button>
                    <Button onClick={onOK} color="primary">OK</Button>
                    <Button onClick={onCancel} color="primary">Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

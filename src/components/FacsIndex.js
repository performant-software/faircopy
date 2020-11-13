import React, { Component } from 'react'
import FacsModeControl from './FacsModeControl';
import { Button, Typography } from '@material-ui/core';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Checkbox } from '@material-ui/core';

import { getLocalString } from '../tei-document/iiif'

export default class FacsIndex extends Component {   

    constructor() {
        super()
        this.state = {
            allChecked: false,
            checked: {}
        }
    }

    renderSurfaceIndex() {
        const facsDocument = this.getFacsDocument()
        const { surfaces } = facsDocument.facs

        const onClick = (e) => {
            console.log('click')
        //   const { onResourceAction } = this.props
        //   const resourceID = e.currentTarget.getAttribute('dataresourceid')
        //   onResourceAction( 'open', [resourceID] )
        }

        const toggleAll = () => {
            const { checked, allChecked } = this.state
            const nextAllChecked = !allChecked
            const nextChecked = { ...checked }
            for( const surface of surfaces ) {
            nextChecked[surface.id] = nextAllChecked
            }
            this.setState({ ...this.state, checked: nextChecked, allChecked: nextAllChecked })
        }

        const onClickCheck = (e) => {
            const { checked } = this.state
            const nextChecked = { ...checked }
            const resourceID = e.currentTarget.getAttribute('dataresourceid')
            nextChecked[resourceID] = checked[resourceID] ? false : true
            this.setState({ ...this.state, checked: nextChecked })
        }

        const cellProps = {
            padding: 'none',
            component: "th",
            scope: "row"
        }

        const { checked, allChecked } = this.state

        const surfaceRows = []
        for( const surface of surfaces ) {
            const labels = getLocalString(surface.localLabels, 'en')
            const title = labels[0]
            // const subHeadings = labels.slice(1)
    
            const check = checked[surface.id] === true
            surfaceRows.push(
                <TableRow hover key={`surface-${surface.id}`}>
                    <TableCell {...cellProps} >
                        <Checkbox onClick={onClickCheck} dataresourceid={surface.id} color="default" checked={check} />
                    </TableCell>
                    <TableCell onClick={onClick} dataresourceid={surface.id} {...cellProps} >
                        {title}
                    </TableCell>
                    <TableCell onClick={onClick} dataresourceid={surface.id} {...cellProps} >
                        {surface.id}
                    </TableCell>
                </TableRow>
            )
        }
    
        return (
            <TableContainer className="table-container" component={Paper}>
                <Table stickyHeader size="small" >
                <TableHead>
                    <TableRow>
                    <TableCell padding="none"><Checkbox onClick={toggleAll} color="default" checked={allChecked} /></TableCell>
                    <TableCell padding="none">Name</TableCell>
                    <TableCell padding="none">ID</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { surfaceRows }
                </TableBody>
                </Table>
            </TableContainer>
        )
    }
    
    renderToolbar() {
        const { onChangeMode } = this.props
        
        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div className='top-bar' >
                <Button
                    className="toolbar-button"
                    {...buttonProps}
                >
                    Add Image
                </Button> 
                <Button
                    disabled
                    className="toolbar-button-right"
                    {...buttonProps}
                >
                    <i className="fas fa-save fa-2x"></i>
                </Button> 
                <FacsModeControl
                    selected={'index'}
                    buttonProps={buttonProps}
                    onChangeMode={onChangeMode}
                ></FacsModeControl>
            </div>
        )
    }

    getFacsDocument() {
        if( this.props.imageView ) {
            const { imageView } = this.props
            return imageView.facsDocument
        } else {
            return this.props.facsDocument
        }
    }
    
    render() {
        const { fairCopyProject } = this.props
        const facsDocument = this.getFacsDocument()
        const resourceName = fairCopyProject ? fairCopyProject.resources[facsDocument.resourceID].name : ""

        const showSearchBar = !!this.props.facsDocument

        return (
            <div id="FacsIndex" >
                { showSearchBar && 
                    <div>
                        <div className="titlebar">
                            <Typography component="h1" variant="h6">{resourceName}</Typography>
                        </div>        
                        { this.renderToolbar() }
                    </div>
                }
                <div className="facs-index-list">
                    { this.renderSurfaceIndex() }
                </div>
            </div>
        )
    }
}


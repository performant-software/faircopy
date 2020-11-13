import React, { Component } from 'react'
import FacsModeControl from './FacsModeControl';
import { Button, Typography } from '@material-ui/core';
import { TableContainer, TablePagination, Table, TableHead, TableRow, TableCell, TableBody, Paper, Checkbox } from '@material-ui/core';

import { getLocalString } from '../tei-document/iiif'

const rowsPerPage = 100

export default class FacsIndex extends Component {   

    constructor() {
        super()
        this.state = {
            allChecked: false,
            currentPage: 0,
            checked: {}
        }
    }

    renderSurfaceIndex() {
        const { facsDocument, onChangeView, surfaceIndex } = this.props
        const { surfaces } = facsDocument.facs

        const onClick = (e) => {
            const selection = e.currentTarget.getAttribute('datasurfaceindex')
            onChangeView(parseInt(selection), 'detail')
        }

        const toggleAll = () => {
            const { checked, allChecked } = this.state
            const nextAllChecked = !allChecked
            const nextChecked = { ...checked }
            for( let i=0; i < surfaces.length; i++ ) {
                nextChecked[i] = nextAllChecked
            }
            this.setState({ ...this.state, checked: nextChecked, allChecked: nextAllChecked })
        }

        const onClickCheck = (e) => {
            const { checked } = this.state
            const nextChecked = { ...checked }
            const surfaceIndex = e.currentTarget.getAttribute('datasurfaceindex')
            nextChecked[surfaceIndex] = checked[surfaceIndex] ? false : true
            this.setState({ ...this.state, checked: nextChecked })
        }

        const cellProps = {
            padding: 'none',
            component: "th",
            scope: "row"
        }

        const { checked, allChecked, currentPage } = this.state

        const surfaceRows = []
        let index=0
        for( const surface of surfaces ) {
            const labels = getLocalString(surface.localLabels, 'en')
            const title = labels[0]
            // const subHeadings = labels.slice(1)
    
            const check = checked[index] === true
            const selectionClass = surfaceIndex === index ? 'row-selected' : ''
            surfaceRows.push(
                <TableRow hover className={selectionClass} key={`surface-${index}`}>
                    <TableCell {...cellProps} >
                        <Checkbox onClick={onClickCheck} datasurfaceindex={index} color="default" checked={check} />
                    </TableCell>
                    <TableCell onClick={onClick} datasurfaceindex={index} {...cellProps} >
                        {title}
                    </TableCell>
                    <TableCell onClick={onClick} datasurfaceindex={index} {...cellProps} >
                        {surface.id}
                    </TableCell>
                </TableRow>
            )
            index++
        }

        const onChangePage = (e,page) => { this.setState({...this.state, currentPage: page})}
        const start = rowsPerPage * currentPage
        const end = start + 100
    
        return (
            <Paper >
                <TableContainer className="table-container">
                    <Table stickyHeader size="small" >
                        <TableHead>
                            <TableRow>
                                <TableCell padding="none"><Checkbox onClick={toggleAll} color="default" checked={allChecked} /></TableCell>
                                <TableCell padding="none">Name</TableCell>
                                <TableCell padding="none">ID</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            { surfaceRows.slice(start,end) }
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    rowsPerPageOptions={[rowsPerPage]}
                    count={surfaceRows.length}
                    rowsPerPage={rowsPerPage}
                    page={currentPage}
                    onChangePage={onChangePage}
                />
            </Paper>
        )
    }
    
    renderToolbar() {
        const { onChangeView, onEditResource, surfaceIndex } = this.props
        
        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div className='top-bar' >
                <Button
                    className="toolbar-button"
                    variant="outlined"
                    size="small"              
                    {...buttonProps}
                >
                    Add Image
                </Button> 
                <Button
                    disabled
                    onClick={onEditResource}
                    {...buttonProps}
                >
                    <i className="far fa-edit fa-2x"></i>
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
                    surfaceIndex={surfaceIndex}
                    buttonProps={buttonProps}
                    onChangeView={onChangeView}
                ></FacsModeControl>
            </div>
        )
    }
    
    render() {
        const { fairCopyProject, facsDocument } = this.props
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


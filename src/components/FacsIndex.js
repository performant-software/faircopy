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

    onOpenActionMenu = (anchorEl) => {    
        const { onOpenPopupMenu, onConfirmDeleteImages } = this.props
        
        const menuOptions = [
          {
            id: 'delete',
            label: 'Delete',
            action: () => {
                const doomedSurfaces = []
                const { checked } = this.state
                for( const surfaceIndex of Object.keys(checked) ) {
                    if( checked[surfaceIndex] ) {
                        doomedSurfaces.push(parseInt(surfaceIndex)) 
                    }
                }

                const surfaceCount = doomedSurfaces.length
                const { facsDocument } = this.props
                const onDelete = () => {
                    facsDocument.deleteSurfaces(doomedSurfaces)
                    this.setState({ ...this.state, checked: {}, allChecked: false })    
                }
                onConfirmDeleteImages({ onDelete, surfaceCount })
                return true
            }
          }
        ]
        onOpenPopupMenu(menuOptions, anchorEl)
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
        const { checked } = this.state
        const { onChangeView, onEditResource, surfaceIndex, onAddImages } = this.props

        const iconButtonProps = {
            disableRipple: true,
            disableFocusRipple: true,
        }

        const textButtonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true,
            variant: "outlined",
            size: 'small',      
        }

        const actionsEnabled = Object.values(checked).find( c => c === true )

        return (
            <div className='top-bar' >
                <Button
                    onClick={onAddImages}
                    {...textButtonProps}
                >
                    Add Images
                </Button> 
                <Button 
                    disabled={!actionsEnabled}
                    ref={(el)=> { this.actionButtonEl = el }}
                    onClick={()=>{this.onOpenActionMenu(this.actionButtonEl)}}         
                    {...textButtonProps}
                    >Actions<i className='down-caret fas fa-caret-down fa-lg'></i>
                </Button> 
                <Button
                    onClick={onEditResource}
                    {...iconButtonProps}
                >
                    <i className="far fa-edit fa-2x"></i>
                </Button>                   
                <FacsModeControl
                    selected={'index'}
                    surfaceIndex={surfaceIndex}
                    buttonProps={iconButtonProps}
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


import React, { Component } from 'react'
import FacsModeControl from './FacsModeControl'
import { Button, Tooltip } from '@material-ui/core'
import { TablePagination, TableHead, TableRow, TableCell, Paper, Checkbox } from '@material-ui/core'

import { getLocalString } from '../../../model/iiif'
import DragAndDropTable from '../../common/DragAndDropTable'
import DraggableComponent from '../../common/DraggableComponent'
import TitleBar from '../TitleBar'
import { getLicenseType } from '../../../model/license-key'

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

    componentDidMount() {
        const { facsDocument } = this.props
        facsDocument.addUpdateListener(this.updateListener)
    }
    
    componentWillUnmount() {
        const { facsDocument } = this.props
        facsDocument.removeUpdateListener(this.updateListener)
    }

    // listen for updates from other processes 
    updateListener = () => {
        this.setState({...this.state})
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

    renderSurfaceRows() {
        const { facsDocument, onChangeView, surfaceIndex } = this.props
        const { surfaces } = facsDocument.facs
        const { checked } = this.state

        const onClick = (e) => {
            const selection = e.currentTarget.getAttribute('datasurfaceindex')
            onChangeView(parseInt(selection), 'detail')
        }

        const onKeyUp = (e) => {
            if( e.keyCode === 13 ) {
                const selection = e.currentTarget.getAttribute('datasurfaceindex')
                onChangeView(parseInt(selection), 'detail')
            }
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
            component: "td",
            scope: "row"
        }
        const surfaceRows = []
        let index=0
        for( const surface of surfaces ) {
            const labels = getLocalString(surface.localLabels, 'en')
            const title = labels[0]
            // const subHeadings = labels.slice(1)
    
            const check = checked[index] === true
            const selectionClass = surfaceIndex === index ? 'row-selected' : ''
            surfaceRows.push(
                <TableRow component={DraggableComponent(surface.id, index)} hover className={selectionClass} key={`surface-${index}`}>
                    <TableCell onClick={onClickCheck} datasurfaceindex={index} {...cellProps} >
                        <Tooltip title="Grab a row to move it."><i className="grab-handle fa fa-sm fa-grip-horizontal"></i></Tooltip>
                        <Checkbox onKeyUp={onKeyUp} color="default" checked={check} />
                    </TableCell>
                    <TableCell onKeyUp={onKeyUp} onClick={onClick} datasurfaceindex={index} {...cellProps} >
                        {title}
                    </TableCell>
                    <TableCell onKeyUp={onKeyUp} onClick={onClick} datasurfaceindex={index} {...cellProps} >
                        {surface.id}
                    </TableCell>
                </TableRow>
            )
            index++
        }

        return surfaceRows
    }

    onDragEnd = (result) => {
        const { facsDocument } = this.props
        const { surfaces } = facsDocument.facs

        // dropped outside the list
        if (!result.destination) {
            return
        }

        console.log(`dragEnd ${result.source.index} to  ${result.destination.index}`)
        const nextSurfaces = reorder(
            surfaces,
            result.source.index,
            result.destination.index
        )

        facsDocument.facs.surfaces = nextSurfaces
        facsDocument.save()
        this.setState({...this.state})
    }

    renderTableHead() {
        const { facsDocument } = this.props
        const { surfaces } = facsDocument.facs

        const toggleAll = () => {
            const { checked, allChecked } = this.state
            const nextAllChecked = !allChecked
            const nextChecked = { ...checked }
            for( let i=0; i < surfaces.length; i++ ) {
                nextChecked[i] = nextAllChecked
            }
            this.setState({ ...this.state, checked: nextChecked, allChecked: nextAllChecked })
        }

        const { allChecked } = this.state

        return ( 
            <TableHead  >
                <TableRow>
                    <TableCell padding="none">
                        <i className="toggle-all-gap"></i>
                        <Checkbox onClick={toggleAll} color="default" checked={allChecked} />
                    </TableCell>
                    <TableCell padding="none">Name</TableCell>
                    <TableCell padding="none">ID</TableCell>
                </TableRow>
            </TableHead>
        )
    }
    
    renderSurfaceIndex() {
        const surfaceRows = this.renderSurfaceRows()
        const { isWindowed } = this.props
        const { currentPage } = this.state

        const onChangePage = (e,page) => { this.setState({...this.state, currentPage: page})}
        const start = rowsPerPage * currentPage
        const end = start + 100

        const licenseType = getLicenseType()        
        const modeClass = licenseType === 'free' && !isWindowed ? "facs-index-container-with-bar" : ""

        return (
            <Paper className={modeClass}>
                <DragAndDropTable
                    tableHead={this.renderTableHead()}
                    rows={surfaceRows.slice(start,end)}
                    onDragEnd={this.onDragEnd}
                    caption={"This table lists the image surfaces for this facsimile."}
                ></DragAndDropTable>
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
        const { onChangeView, onEditResource, surfaceIndex, onAddImages, onWindow, facsDocument } = this.props

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
        const { surfaces } = facsDocument.facs
        const detailEnabled = surfaces.length > 0
        const editable = facsDocument.isEditable()
        const remote = facsDocument.isRemote()

        return (
            <div>
                { editable && <span>
                    { !remote && <Button
                        onClick={onAddImages}
                        {...textButtonProps}
                    >
                        Add Images
                    </Button> }
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
                </span> }
                <FacsModeControl
                    selected={'index'}
                    detailEnabled={detailEnabled}
                    surfaceIndex={surfaceIndex}
                    buttonProps={iconButtonProps}
                    onChangeView={onChangeView}
                    onWindow={onWindow}
                ></FacsModeControl>
            </div>
        )
    }
    
    render() {
        const { resourceEntry, parentResource, onResourceAction, isWindowed, facsDocument, currentView } = this.props
        const {isLoggedIn} = facsDocument.imageViewContext

        return (
            <div id="FacsIndex" >
                <div>
                    <TitleBar 
                        resourceName={ resourceEntry.name } 
                        onResourceAction={onResourceAction} 
                        parentResource={ parentResource } 
                        isImageWindow={isWindowed}
                        isLoggedIn={isLoggedIn}
                        currentView={currentView}
                    >
                    </TitleBar>
                    { this.renderToolbar() }
                </div>
                <div className="facs-index-list">
                    { this.renderSurfaceIndex() }
                </div>
            </div>
        )
    }
}

function reorder(list, startIndex, endIndex) {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)

    return result
}

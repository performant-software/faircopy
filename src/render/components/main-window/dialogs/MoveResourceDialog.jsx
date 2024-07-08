import React, { Component } from 'react'

import { Button, TableRow, TableCell, TableContainer, TableHead, Table, TableBody, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { getResourceIcon, getResourceIconLabel } from '../../../model/resource-icon';

export default class MoveResourceDialog extends Component {

    constructor(props) {
        super(props)
        this.state = {
            targetID: null
        }
    }

    getMoveTargets = () => {
        const { resourceType, localResources } = this.props

        if( !localResources ) return []

        const moveTargets = []
        for( const resourceEntry of Object.values(localResources) ) {
            const { type: currentResourceType, deleted } = resourceEntry                
            if( currentResourceType === resourceType && !deleted ) {
                moveTargets.push(resourceEntry)
            }
        }

        return moveTargets
    }

    renderRow(resource) {
        const { targetID } = this.state

        const onSelect = (e) => {
            const resourceID = e.currentTarget.getAttribute('dataresourceid')
            this.setState({...this.state, targetID: resourceID})
        }

        const cellProps = {
            padding: 'none',
            component: "th",
            scope: "row"
        }

        if( !resource ) {    
            const selected = targetID === 'ROOT' ? 'selected' : ''
            return (
                <TableRow hover onClick={onSelect} className={selected} dataresourceid='ROOT' key={`resource-ROOT`}>
                    <TableCell {...cellProps} >
                        <i className={`fa fa-home-alt fa-lg`}></i>
                    </TableCell>
                    <TableCell {...cellProps} >
                        Project Home
                    </TableCell>
                    <TableCell {...cellProps} >
                    </TableCell>
                </TableRow>
            )
        } else {
            const selected = resource.id === targetID ? 'selected' : ''
            const resourceIcon = getResourceIcon(resource.type)
            const resourceLabel = getResourceIconLabel(resource.type)

            return (
                <TableRow hover onClick={onSelect} className={selected} dataresourceid={resource.id} key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        <i aria-label={resourceLabel} className={`${resourceIcon} fa-lg`}></i>
                    </TableCell>
                    <TableCell {...cellProps} >
                        {resource.name}
                    </TableCell>
                    <TableCell {...cellProps} >
                        {resource.localID}
                    </TableCell>
                </TableRow>
            )
        }        
    }

    renderTable() {
        const { allowRoot } = this.props
        const moveTargets = this.getMoveTargets()

        const rows = []
        if( allowRoot ) {
            rows.push(this.renderRow(null))
        }
        for( const moveTarget of moveTargets ) {            
            rows.push(this.renderRow(moveTarget))
        }

        return (
            <TableContainer className="table-container">
                <Table stickyHeader size="small" >
                    <TableHead>
                        <TableRow>
                            <TableCell padding="none">Type</TableCell>
                            <TableCell padding="none">Name</TableCell>
                            <TableCell padding="none">ID</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        { rows }
                    </TableBody>
                </Table>
          </TableContainer>
        )
    }

    onClickMove = () => {
        const { onClose, movingItems, onMove } = this.props
        const { targetID } = this.state
        const moveTargets = this.getMoveTargets()

        const parentEntry = targetID === 'ROOT' ? null : moveTargets.find( r => r.id === targetID )
        onMove( movingItems, parentEntry )
        onClose()
    }

    render() {      
        const { onClose, onMoved, movingItems } = this.props
        const { targetID } = this.state

        const moveDisabled = (targetID === null)

        const onClickClose = () => {
            if( onMoved ) onMoved(false)
            onClose()
        }

        return (
            <Dialog
                id="MoveResourceDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="move-resource-dialog"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="move-resource-dialog">Copy Resources ({movingItems.length})</DialogTitle>
                <DialogContent>
                    <Typography>Select a destination for these resources: </Typography>
                    { this.renderTable() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" disabled={moveDisabled} color="primary" onClick={this.onClickMove} autoFocus>Move</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

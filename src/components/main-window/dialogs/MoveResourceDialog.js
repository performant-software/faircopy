import React, { Component } from 'react'

import { Button, TableRow, TableCell, TableContainer, TableHead, Table, TableBody, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

export default class MoveResourceDialog extends Component {

    constructor(props) {
        super(props)
        this.state = this.initialState(props)
    }

    initialState(props) {
        const { resources } = props.fairCopyProject

        // take the resources, find the TEI docs
        const teiDocs = []
        for( const resource of Object.values(resources) ) {
            if( resource.type === 'teidoc' ) {
                teiDocs.push(resource)
            }
        }

        return {
            targetID: null,
            teiDocs
        }
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

            return (
                <TableRow hover onClick={onSelect} className={selected} dataresourceid={resource.id} key={`resource-${resource.id}`}>
                    <TableCell {...cellProps} >
                        <i className={`fa fa-books fa-lg`}></i>
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
        const { teiDocs } = this.state

        const teiDocRows = []
        teiDocRows.push(this.renderRow(null))
        for( const teiDoc of teiDocs ) {            
            teiDocRows.push(this.renderRow(teiDoc))
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
                        { teiDocRows }
                    </TableBody>
                </Table>
          </TableContainer>
        )
    }

    render() {      
        const { targetID } = this.state
        const { onClose, resourceIDs, closeResources } = this.props
        
        const onClickMove = () => {
            const { targetID } = this.state
            const { fairCopyProject } = this.props

            // ignore the tei docs
            const validIDs = []
            for( const resourceID of resourceIDs ) {
                const resourceEntry = fairCopyProject.getResourceEntry(resourceID)
                if( resourceEntry.type !== 'teidoc' ) {
                    validIDs.push(resourceID)
                }
            }

            const parentID = targetID === 'ROOT' ? null : targetID
            fairCopyProject.moveResources( validIDs, parentID )
            closeResources(validIDs, false, false )  
            onClose()
        }

        const moveDisabled = (targetID === null)

        return (
            <Dialog
                id="MoveResourceDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="move-resource-dialog"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="move-resource-dialog">Move Resources ({resourceIDs.length})</DialogTitle>
                <DialogContent>
                    <Typography>Select a destination for these resources: </Typography>
                    { this.renderTable() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" disabled={moveDisabled} color="primary" onClick={onClickMove} autoFocus>Move</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

import React, { Component } from 'react'

import { Button, TableRow, TableCell, TableContainer, TableHead, Table, TableBody, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class MoveResourceDialog extends Component {

    constructor(props) {
        super(props)
        this.state = {
            targetID: null,
            teiDocs: []
        }
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('localResources', this.onLocalResources )
        services.ipcSend('requestLocalResources')
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('localResources', this.onLocalResources )
    }

    onLocalResources = (event,localResources) => {
        const teiDocs = []
        for( const resourceEntry of Object.values(localResources) ) {
            const { type: resourceType, deleted } = resourceEntry                
            if( resourceType === 'teidoc' && !deleted ) {
                teiDocs.push(resourceEntry)
            }
        }
        this.setState({...this.state, teiDocs })
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

    onClickMove = () => {
        const { onClose, fairCopyProject, resourceEntries } = this.props
        const { targetID, teiDocs } = this.state

        const validEntries = resourceEntries.filter( r => r.type !== 'teidoc' )
        const parentEntry = targetID === 'ROOT' ? null : teiDocs.find( r => r.id === targetID )
        fairCopyProject.moveResources( validEntries, parentEntry )
        onClose()
    }

    render() {      
        const { onClose, resourceEntries } = this.props
        const { targetID } = this.state

        const moveDisabled = (targetID === null)

        return (
            <Dialog
                id="MoveResourceDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="move-resource-dialog"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="move-resource-dialog">Move Resources ({resourceEntries.length})</DialogTitle>
                <DialogContent>
                    <Typography>Select a destination for these resources: </Typography>
                    { this.renderTable() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" disabled={moveDisabled} color="primary" onClick={this.onClickMove} autoFocus>Move</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

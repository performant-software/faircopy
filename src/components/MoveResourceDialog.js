import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core'

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

    renderList() {
        const { targetID, teiDocs } = this.state

        const onSelect = (e) => {
            const resourceID = e.currentTarget.getAttribute('dataresourceid')
            this.setState({...this.state, targetID: resourceID})
        }

        // create the root folder option
        const rootSelected = targetID === 'ROOT' ? 'selected' : ''
        const rootEl = <li onClick={onSelect} dataresourceid="ROOT" className={rootSelected} key="mr-ROOT"><Typography>ROOT</Typography></li>

        const teiDocEls = []
        teiDocEls.push(rootEl)
        for( const teiDoc of teiDocs ) {
            const selected = teiDoc.id === targetID ? 'selected' : ''
            const teiDocEl = <li onClick={onSelect} dataresourceid={teiDoc.id} className={selected} key={`mr-${teiDoc.id}`}><Typography>{teiDoc.name}</Typography></li>
            teiDocEls.push(teiDocEl)
        }

        return (
            <div>
                <ul>
                    {teiDocEls}
                </ul>
            </div>
        )
    }

    render() {      
        const { targetID } = this.state
        const { onClose } = this.props
        
        const onClickMove = () => {
            const { targetID } = this.state
            const { fairCopyProject, resourceIDs } = this.props

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
            onClose()
        }

        const moveDisabled = (targetID === null)

        return (
            <Dialog
                id="MoveResourceDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Move Resources</DialogTitle>
                <DialogContent>
                    { this.renderList() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" disabled={moveDisabled} color="primary" onClick={onClickMove} autoFocus>Move</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

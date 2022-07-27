import React, { Component } from 'react'
import { Button } from '@material-ui/core';

const fairCopy = window.fairCopy

export default class ReadOnlyToolbar extends Component {

    onCheckOut = () => {
        const { teiDocument } = this.props
        const { fairCopyProject } = teiDocument
        const { email, serverURL, projectID } = fairCopyProject
        fairCopy.services.ipcSend('checkOut', email, serverURL, projectID, [ teiDocument.resourceID ] )
    }

    render() {
        const { teiDocument } = this.props
        const disabled = !teiDocument.fairCopyProject.isLoggedIn()
        const header = teiDocument.resourceType === 'header'

        return (
            <div id="ReadOnlyToolbar">
                <div className="leftgroup">
                    { !header && <Button disabled={disabled} onClick={this.onCheckOut} variant="outlined" size='small'>Check Out</Button> }
                </div>
                <div className="rightgroup">
                </div>
            </div>
        )
    }
}

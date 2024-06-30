import React, { Component } from 'react'
import { Button } from '@material-ui/core';
import { canCheckOut } from '../../../model/permissions'

const fairCopy = window.fairCopy

export default class ReadOnlyToolbar extends Component {

    onCheckOut = () => {
        const { teiDocument } = this.props
        const { fairCopyProject } = teiDocument
        const { userID, serverURL, projectID } = fairCopyProject
        fairCopy.ipcSend('checkOut', userID, serverURL, projectID, [ teiDocument.resourceEntry ] )
    }

    onFind = () => {
        const { onToggleSearchBar } = this.props
        onToggleSearchBar(true)
    }

    render() {
        const { teiDocument } = this.props
        const { fairCopyProject } = teiDocument
        const { permissions } = fairCopyProject
        const disabled = !fairCopyProject.isLoggedIn() || !canCheckOut(permissions)
        const header = teiDocument.resourceType === 'header'

        return (
            <div id="ReadOnlyToolbar">
                <div className="leftgroup">
                    { !header && <Button className="toolbar-button" disabled={disabled} onClick={this.onCheckOut} variant="outlined" size='small'>Check Out</Button> }
                    { <Button className="toolbar-button" onClick={this.onFind} variant="outlined" size='small'><i className='fas fa-magnifying-glass'></i> Search</Button> }
                </div>
                <div className="rightgroup">
                </div>
            </div>
        )
    }
}

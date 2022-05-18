import React, { Component } from 'react'
import { Button } from '@material-ui/core';
import { checkOut } from '../../../model/resource-index-view';

export default class ReadOnlyToolbar extends Component {

    onCheckOut = () => {
        const { teiDocument, onCheckedOut } = this.props
        const { fairCopyProject } = teiDocument
        checkOut( fairCopyProject, [teiDocument.resourceID], (message) => { 
            onCheckedOut()
        } )
    }

    render() {
        const { teiDocument } = this.props
        const disabled = !teiDocument.fairCopyProject.isLoggedIn()

        return (
            <div id="ReadOnlyToolbar">
                <div className="leftgroup">
                    <Button disabled={disabled} onClick={this.onCheckOut} variant="outlined" size='small'>Check Out</Button>
                </div>
                <div className="rightgroup">
                </div>
            </div>
        )
    }
}

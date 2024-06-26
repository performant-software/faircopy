import React, { Component } from 'react'
import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import ReactMarkdown from 'react-markdown'

export default class ReleaseNotesDialog extends Component {

    componentDidMount() {
        // const { appConfig } = this.props
        // const { version } = appConfig
        // REFACTOR
    }

    render() {      
        const { onClose, appConfig } = this.props
        const { releaseNotes } = appConfig

        return (
            <Dialog
                id="ReleaseNotesDialog"
                open={true}
                onClose={onClose}
                maxWidth="md"
                fullWidth={true}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Release Notes</DialogTitle>
                <DialogContent>
                    <div className="notes">
                        <ReactMarkdown children={releaseNotes} />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }
}

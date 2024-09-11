import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Typography, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class IncompatDialog extends Component {

    render() {      
        const { projectFilePath, projectFileVersion } = this.props

        const onClickClose = () => {
            fairCopy.ipcSend('closeProject')
        }

        return (
            <Dialog
                id="IncompatDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Incompatible Project File</DialogTitle>
                <DialogContent>
                   <Typography>Unable to open project file: {projectFilePath}</Typography>
                   <Typography>You must upgrade to v{projectFileVersion} or greater to open this file.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={onClickClose}>OK</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

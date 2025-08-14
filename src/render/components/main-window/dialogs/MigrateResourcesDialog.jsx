import React, { Component } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core';

const fairCopy = window.fairCopy

export default class MigrateResourcesDialog extends Component {
    onClose = () => {
        fairCopy.ipcSend('closeProject')
    }

    onMigrate = () => {
        const { onSuccess, fairCopyProject } = this.props
        fairCopyProject.migrateOrphanedResources()
        onSuccess()
    }

    render() {
        const { open } = this.props
        return (
            <Dialog open={open} onClose={this.onClose} aria-labelledby="migrate-resources-dialog">
                <DialogTitle id="migrate-resources-dialog">Project migration required</DialogTitle>
                <DialogContent>
                    <Typography>
                        This project contains resources at the root level outside of any TEI document.
                        To continue using this project, the resources must be moved into a TEI document.
                    </Typography>
                    <Typography>
                        Click "Migrate" to move these resources and continue using the project.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={this.onClose} color="primary">
                        Close project
                    </Button>
                    <Button variant="contained" onClick={this.onMigrate} color="primary">
                        Migrate
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
}

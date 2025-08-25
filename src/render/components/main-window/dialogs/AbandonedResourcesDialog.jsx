import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@material-ui/core'
import React, { Component } from 'react'

const fairCopy = window.fairCopy

export default class AbandonedResourcesDialog extends Component {

    onClose = () => {
        fairCopy.ipcSend('closeProject')
    }
    render() {
        const { abandonedResources, onDelete, onCreateFromAbandoned } = this.props

        return (
            <Dialog
                id="AbandonedResourcesDialog"
                open
                onClose={this.onClose}
                aria-labelledby="abandoned-dialog-title"
            >
                <DialogTitle id="abandoned-dialog-title">
                    Local/Remote Document Mismatch
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        FairCopy has detected a mismatch between your local project files and the
                        remote server.
                    </Typography>
                    <Typography gutterBottom>
                        This may have occurred if an admin unlocked your checked-out documents for
                        others to edit, or due to a client-server communication error.
                    </Typography>
                    <Typography>
                        To continue using this project, you may choose one of two actions for these
                        documents: <Typography variant="button" dispaly="inline">Delete</Typography> your
                        local document copies entirely;
                        or <Typography variant="button" dispaly="inline">Create New</Typography> ones
                        from their contents (if you have unchecked-in changes you would like to preserve).
                    </Typography>
                    <TableContainer className="abandoned-table">
                        <Table size="small" stickyHeader>
                            <caption>Affected documents</caption>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>ID</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {abandonedResources.filter((r) => r.type === 'teidoc').map((resource) => (
                                    <TableRow key={resource.id}>
                                        <TableCell>
                                            {resource.name}
                                        </TableCell>
                                        <TableCell>
                                            {resource.localID}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="secondary" onClick={onDelete}>Delete</Button>
                    <Button variant="contained" color="primary" onClick={onCreateFromAbandoned}>Create New</Button>
                </DialogActions>
            </Dialog>
        )
    }
}
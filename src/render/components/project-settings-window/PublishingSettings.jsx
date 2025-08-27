import React, { Component } from 'react'
import { Paper, Button, Typography, withStyles, Tooltip } from '@material-ui/core'
import { grey } from '@material-ui/core/colors'
import { StatusChip } from '../main-window/resource-browser/ResourceBrowser'
import { Edit } from '@material-ui/icons';
import CSSEditorDialog from './CSSEditorDialog';

const StyledPaper = withStyles(() => ({
    root: {
        backgroundColor: grey[100]
    },
}))(Paper)

export default class PublishingSettings extends Component {
    constructor(props) {
        super(props)
        this.initialState = {
            editorOpen: false
        }
        this.state = this.initialState
    }
    render() {
        // TODO keep track of if anything changed.
        // Include default CSS that can be reloaded?
        const onPublish = () => {
            this.props.onPublishCss()
        }

        const onOpenEditor = () => {
            this.setState((prevState) => ({
                ...prevState,
                editorOpen: true,
            }))
        }

        const onCloseEditor = () => {
            this.setState((prevState) => ({
                ...prevState,
                editorOpen: false,
            }))
        }

        const { checkedOut, fairCopyConfig, hasDraftCss, hasPublishedCss, onUpdateConfig, publishReadOnly, readOnly } = this.props
        const { editorOpen } = this.state

        const canPublish = !publishReadOnly && hasDraftCss && !checkedOut
        let publishTooltip = "Publish"
        if (!canPublish) {
            publishTooltip = checkedOut ? "Settings must be checked in to publish" : "Project must have draft CSS checked in to publish"
        }

        return (
            <Paper elevation={0} id="PublishingSettings">
                <Typography id="publishing-title" variant="h4">Publishing Settings</Typography>
                <StyledPaper elevation={0} className="css-item">
                    <div className="css-item-title">
                        <Typography variant="h5">Project CSS</Typography>
                        {/* TODO: After upgrading MUI, replace icons ("Task", "EditDocument", "Edit") */}
                        <div className="css-status">
                            {hasDraftCss && (
                                <StatusChip label="Draft" icon={<Edit />} size="small" color="secondary" />
                            )}
                            {hasPublishedCss && (
                                <StatusChip label="Published" icon={<i className="fa fa-file-circle-check"></i>} size="small" color="primary" />
                            )}
                            {/* TODO: Implement tracking unchecked-in changes */}
                            {/* <StatusChip label="Edited" icon={<i className="fa fa-file-lines"></i>} size="small" className="yellow" /> */}
                        </div>
                    </div>
                    {editorOpen && (
                        <CSSEditorDialog
                            fairCopyConfig={fairCopyConfig}
                            onClose={onCloseEditor}
                            onUpdateConfig={onUpdateConfig}
                            readOnly={readOnly}
                        />
                    )}
                    <div className="actions">
                        <Button className="action" variant="outlined" onClick={onOpenEditor} startIcon={readOnly ? <i className="fa fa-eye" /> : <Edit />}>
                            {readOnly ? "View" : "Edit"}
                        </Button>
                        <Tooltip title={publishTooltip} arrow>
                            <span className={canPublish ? `button-wrapper` : ''}>
                                <Button disabled={!canPublish} variant="contained" color="primary" onClick={onPublish}>Publish</Button>
                            </span>
                        </Tooltip>
                    </div>
                </StyledPaper>
            </Paper>
        )
    }
}
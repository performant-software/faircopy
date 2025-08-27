import React, { Component } from 'react'
import { css } from '@codemirror/lang-css';
import CodeMirror from '@uiw/react-codemirror';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography, withStyles } from '@material-ui/core';
import { Close } from '@material-ui/icons';

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

const StyledDialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <DialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
          <Close />
        </IconButton>
      ) : null}
    </DialogTitle>
  );
});

export default class CSSEditorDialog extends Component {
    constructor(props) {
        super(props)

        this.initialState = {
            cssBuffer: props.fairCopyConfig.projectCSS,
            dirty: false,
        }
        this.state = this.initialState
    }

    render() {
        const onChange = (cssNext) => {
            this.setState({ ...this.state, cssBuffer: cssNext, dirty: true })
        }
        const onSave = () => {
            const { onUpdateConfig, fairCopyConfig } = this.props
            const { cssBuffer } = this.state
            fairCopyConfig.projectCSS = cssBuffer
            onUpdateConfig(fairCopyConfig)
            this.setState({ dirty: false })
        }
        const { fairCopyConfig, onClose, readOnly } = this.props
        const { projectCSS } = fairCopyConfig
        const { dirty } = this.state

        return (
            <Dialog
                id="CSSEditorDialog"
                open
                onClose={onClose}
                aria-labelledby="css-dialog-title"
                fullWidth
                maxWidth="md"
            >
                <StyledDialogTitle id="css-dialog-title" onClose={onClose}>
                    Project CSS
                </StyledDialogTitle>
                <DialogContent>
                    <CodeMirror
                        className="cm-editor"
                        editable={!readOnly}
                        value={projectCSS}
                        height="600px"
                        width="900px"
                        extensions={[css()]}
                        onChange={onChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={readOnly || !dirty}
                        className="action"
                        variant="contained"
                        color="primary"
                        onClick={onSave}
                    >
                        Save
                    </Button>
                    <Button
                        className="action"
                        variant="contained"
                        onClick={onClose}
                    >
                        {dirty ? "Cancel" : "Close  "}
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }
}

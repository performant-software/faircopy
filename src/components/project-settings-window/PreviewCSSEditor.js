import React, { Component } from 'react'
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { Paper, Button, Typography } from '@material-ui/core'

export default class PreviewCSSEditor extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            cssBuffer: ""
        }
        this.state = this.initialState
    }

    render() {  
        
        const onChange = (cssNext) => {
            this.setState({ ...this.state, cssBuffer: cssNext })
        }

        // TODO keep track of if anything changed.
        // Include default CSS that can be reloaded?

        const onSave = () => {
            const { onUpdateConfig, fairCopyConfig } = this.props
            const { cssBuffer } = this.state
            fairCopyConfig.projectCSS = cssBuffer
            onUpdateConfig(fairCopyConfig)
        }

        const { readOnly, fairCopyConfig } = this.props
        const { projectCSS } = fairCopyConfig

        return (            
            <Paper id="PreviewCSSEditor">
                <Typography variant="h4">Publishing Settings</Typography>
                <Typography variant="h5">Project CSS</Typography>
                <CodeMirror className="cm-editor" editable={!readOnly} value={projectCSS} height="400px" extensions={[css()]} onChange={onChange} />
                <div className="actions">
                    <Button className="action" variant="contained" onClick={onSave}>Save</Button>
                </div>
            </Paper>
        )
    }
}
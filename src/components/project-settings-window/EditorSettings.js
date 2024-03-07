import React, { Component } from 'react'
import { Paper, Typography } from '@material-ui/core'
import KeyBindingsTable from './KeyBindingsTable'
import ColorCodingPanel from './ColorCodingPanel'

export default class EditorSettings extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedAction: null,
            selectedKey: null,
            keybindingDialog: false
        }
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig, readOnly } = this.props

        return (
            <div id="EditorSettings">
                <Typography variant="h4">Editor Settings</Typography>
                <ColorCodingPanel 
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    readOnly={readOnly}
                    onUpdateConfig={onUpdateConfig}
                />
                <KeyBindingsTable 
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    readOnly={readOnly}
                    onUpdateConfig={onUpdateConfig}
                />
            </div>
        )
    }
}
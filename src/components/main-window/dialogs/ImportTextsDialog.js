import React, { Component } from 'react'

import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Select, MenuItem } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ImportTextsDialog extends Component {
    
    constructor(props) {
        super()
        this.initialState = {
            lineBreakParsing: 'all',
            learnStructure: true,
        }
        this.state = this.initialState
    }

    onChange = (e) => {
        const {name, value} = e.target
        const nextState = { ...this.state }
        nextState[name] = value
        this.setState(nextState)
    }

    renderLearnStructure() {
        const {learnStructure} = this.state 

        return (
            <Select
                name="learnStructure"
                value={learnStructure}
                onChange={this.onChange}
                className='import-option'
            >
                <MenuItem value={true}>Add new elements to schema</MenuItem>
                <MenuItem value={false}>Don't add elements to the schema</MenuItem>
            </Select>
        )
    }

    renderLineBreakOptions() {
        const {lineBreakParsing} = this.state 

        return (
            <Select
                name="lineBreakParsing"
                value={lineBreakParsing}
                onChange={this.onChange}
                className='import-option'
            >
                <MenuItem value={'all'}>Preserve all line breaks</MenuItem>
                <MenuItem value={'multi'}>Preserve only multiple line breaks</MenuItem>
            </Select>
        )
    }

    render() {      
        const { onClose } = this.props
    
        const onClickSelect = () => {
            const { lineBreakParsing, learnStructure } = this.state
            fairCopy.services.ipcSend('requestImport', {lineBreakParsing,learnStructure})
            this.setState(this.initialState)
            onClose()
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        return (
            <Dialog
                id="ImportTextsDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="import-texts-title"
                aria-describedby="import-texts-description"
            >
                <DialogTitle>Import Texts</DialogTitle>
                <DialogContent>
                    <Typography>You can select plain text files (UTF-8 encoded) or XML files to import.</Typography>
                    <Typography>XML files must contain one or more text or facsimile elements. XML elements that are not supported by FairCopy will be ignored, but their contents will be included.</Typography>
                    <Typography component='h2' variant='h6'>Import Options</Typography>
                    { this.renderLineBreakOptions() }<br/>
                    { this.renderLearnStructure() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onClickSelect}>Select Files</Button>   
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

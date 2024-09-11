import React, { Component } from 'react'

import { Button, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Select, MenuItem } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ImportTextsDialog extends Component {
    
    constructor(props) {
        super()
        this.initialState = {
            lineBreakParsing: 'all',
            learnStructure: true,
            resourceType: 'text',
            replaceResource: false
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
            <div className="q-container">
                <Typography className="q-phrase">For XML files, </Typography>
                <Select
                    name="learnStructure"
                    value={learnStructure}
                    onChange={this.onChange}
                    aria-label="Select learn structure mode"
                    className='import-option'
                >
                    <MenuItem value={true}>add new elements </MenuItem>
                    <MenuItem value={false}>don't add new elements</MenuItem>
                </Select>
                <Typography className="q-phrase"> to the schema.</Typography>
            </div>
        )
    }
    
    renderReplaceResource() {
        const {replaceResource} = this.state 

        return (
            <div className="q-container">
                <Select
                    name="replaceResource"
                    value={replaceResource}
                    onChange={this.onChange}
                    aria-label="Select replace resource mode"
                    className='import-option'
                >
                    <MenuItem value={true}>Replace</MenuItem>
                    <MenuItem value={false}>Don't Replace</MenuItem>
                </Select>
                <Typography className="q-phrase"> resources with the same ID.</Typography>
            </div>
        )
    }

    renderLineBreakOptions() {
        const {lineBreakParsing, resourceType} = this.state 

        return (
            <div className="q-container">
                <Typography className="q-phrase">For plain text files, generate a </Typography>
                <Select
                    name="resourceType"
                    value={resourceType}
                    onChange={this.onChange}
                    aria-label="Select resource type"
                    className='import-option'
                >
                    <MenuItem value={'text'}>text</MenuItem>
                    <MenuItem value={'sourceDoc'}>source document</MenuItem>
                </Select>
                <Typography className="q-phrase"> resource.</Typography>
                { resourceType === 'text' && <Typography className="q-phrase"> Preserve </Typography> }
                { resourceType === 'text' && <Select
                    name="lineBreakParsing"
                    value={lineBreakParsing}
                    onChange={this.onChange}
                    aria-label="Select line break mode"
                    className='import-option'
                >
                    <MenuItem value={'all'}>all</MenuItem>
                    <MenuItem value={'multi'}>only multiple</MenuItem>
                </Select> }
                { resourceType === 'text' && <Typography className="q-phrase"> line breaks.</Typography> }
            </div>
        )
    }

    render() {      
        const { onClose } = this.props
    
        const onClickSelect = () => {
            const { lineBreakParsing, learnStructure, resourceType, replaceResource } = this.state
            fairCopy.ipcSend('requestImport', {lineBreakParsing,learnStructure,resourceType,replaceResource})
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
                    { this.renderLineBreakOptions() }
                    { this.renderLearnStructure() }
                    { this.renderReplaceResource() }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onClickSelect}>Select Files</Button>   
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}

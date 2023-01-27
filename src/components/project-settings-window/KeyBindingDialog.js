import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

import ElementMenu from "../main-window/tei-editor/ElementMenu"

export default class KeyBindingDialog extends Component {

    constructor(props) {
        super(props)

        const { selectedKeybinding } = this.props
        this.state = {
            title: selectedKeybinding ? "Edit Keybinding" : "New Keybinding",
            chord: selectedKeybinding?.chord,
            elementType: selectedKeybinding?.elementType,
            elementName: selectedKeybinding?.elementName,
            elementMenuOptions: null
        }
        this.elementMenuAnchors = {}
    }

    renderChordField() {
        const { chord } = this.state
        const onKeyDown = () => {
            // TODO
        }

        return (
            <div>{ chord }</div>
        )
    }

    renderElementField() {
        const { elementType, elementName } = this.state

        const onClick = () => {
            this.setState({...this.state, elementMenuOptions: { menuGroup: 'mark' } })
        }

        //<i className={`${icon} fa-sm`}></i>
        return (
            <Button
                onClick={onClick}
                ref = { (el)=> { this.elementMenuAnchors.mark = el } }
            >
                { `${elementType} ${elementName}` }
            </Button>
        )
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, elementMenuOptions: null })
    }

    renderElementMenu() {
        const { fairCopyConfig, teiSchema } = this.props
        const { elementMenuOptions } = this.state

        if(!elementMenuOptions) return null

        const { menus } = fairCopyConfig
        const { elements } = teiSchema
        
        const onAction = (member) => {
            console.log(member)
        }

        return (
            <ElementMenu
                menus={menus}
                elements={elements}
                onClose={ () => {
                    this.setState({...this.state, elementMenuOptions: null })
                } }
                elementMenuAnchors={this.elementMenuAnchors}
                onAction={onAction}
                validAction={() => { return true }}
                onExited={() => {}}
                {...elementMenuOptions}
            ></ElementMenu>
        )
    }

    render() {      
        const { onClose, onSave } = this.props
        const { title, chord, elementType, elementName } = this.state

        const onClickSave = () => {
            onSave(chord, elementType, elementName)
        }

        return (
            <Dialog
                id="KeyBindingDialog"
                open={true}
                aria-labelledby="keybinding-title"
            >
                <DialogTitle id="keybinding-title">{ title }</DialogTitle>
                <DialogContent>
                    { this.renderChordField() }
                    { this.renderElementField() }
                </DialogContent>
                <DialogActions>
                    <Button disabled={ !chord || !elementName } variant="contained" color="primary" onClick={onClickSave}>Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
                { this.renderElementMenu() }
            </Dialog>
        )
    }

}

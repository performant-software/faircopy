import React, { Component } from 'react'

import { Button } from '@material-ui/core'

import { eraseSelection } from "../tei-document/editor-actions"

export default class EditorToolbar extends Component {
    
    constructor() {
        super()
        this.state = {
            selectedAction: "replace"
        }

        this.buttonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true
        }
    }

    renderActionButtons() {
        const { teiDocument } = this.props
        const { selectedAction } = this.state

        const selectionClass = {}
        selectionClass.replace = selectedAction === 'replace' ? 'selected-action' : ''
        selectionClass.addAbove = selectedAction === 'addAbove' ? 'selected-action' : ''
        selectionClass.addBelow = selectedAction === 'addBelow' ? 'selected-action' : ''
        selectionClass.addOutside = selectedAction === 'addOutside' ? 'selected-action' : ''
        selectionClass.addInside = selectedAction === 'addInside' ? 'selected-action' : ''

        return (
            <div style={{display: 'inline-block'}}>
                <Button
                    onClick={()=>{this.setState({...this.state, selectedAction: 'replace'})}}
                    {...this.buttonProps}
                >
                    <i className={`far ${selectionClass.replace} fa-crosshairs fa-2x`}></i>
                </Button>  
                <Button
                    onClick={()=>{this.setState({...this.state, selectedAction: 'addAbove'})}}
                    {...this.buttonProps}
                >
                    <i className={`far ${selectionClass.addAbove} fa-arrow-to-top fa-2x`}></i>
                </Button>  
                <Button
                    onClick={()=>{this.setState({...this.state, selectedAction: 'addBelow'})}}
                    {...this.buttonProps}
                >
                    <i className={`far ${selectionClass.addBelow} fa-arrow-to-bottom fa-2x`}></i>
                </Button>  
                <Button
                    onClick={()=>{this.setState({...this.state, selectedAction: 'addOutside'})}}
                    {...this.buttonProps}
                >
                    <i className={`far ${selectionClass.addOutside} fa-arrow-to-left fa-2x`}></i>
                </Button>  
                <Button
                    onClick={()=>{this.setState({...this.state, selectedAction: 'addInside'})}}
                    {...this.buttonProps}
                >
                    <i className={`far ${selectionClass.addInside} fa-arrow-to-right fa-2x`}></i>
                </Button>  
                <Button
                    onClick={()=>{eraseSelection(teiDocument)}}
                    {...this.buttonProps}
                >
                    <i className="fas fa-eraser fa-2x"></i>
                </Button>  
            </div>
        )
    }

    renderElementMenuButtons() {
        const { onOpenElementMenu, teiDocument } = this.props
        const { selectedAction } = this.state
        const { fairCopyProject } = teiDocument

        const onClickMarker = () => {
            const { menus } = fairCopyProject
            const menuGroups = menus['mark']
            onOpenElementMenu({ menuGroups, anchorEl: this.markerButtonEl, action: 'create'})
        }

        const onClickStructure = () => {
            const { menus } = fairCopyProject
            const menuGroups = menus['structure']
            onOpenElementMenu({ menuGroups, anchorEl: this.structureButtonEl, action: selectedAction })
        }

        return (
            <div style={{display: 'inline-block'}}>
                <Button
                    ref={(el)=> { this.markerButtonEl = el }}
                    onClick={onClickMarker}
                    {...this.buttonProps}
                >
                    <i className="far fa-marker fa-2x"></i>
                </Button> 
                <Button
                    ref={(el)=> { this.structureButtonEl = el }}
                    onClick={onClickStructure}
                    {...this.buttonProps}
                >
                    <i className="far fa-page-break fa-2x"></i>
                </Button>    
                <Button
                    {...this.buttonProps}
                >
                    <i className="far fa-anchor fa-2x"></i>
                </Button>  
            </div>
        )
    }

    render() {
        const { onEditResource, teiDocument } = this.props
        const { changedSinceLastSave } = teiDocument

        const onClickSave = () => {
            teiDocument.save()
            teiDocument.refreshView()
        }

        return (
            <div id="EditorToolbar">
                <div className="leftgroup">
                    { this.renderElementMenuButtons() }
                    { this.renderActionButtons() }
                    <Button
                        onClick={onEditResource}
                        {...this.buttonProps}
                    >
                        <i className="far fa-edit fa-2x"></i>
                    </Button>                   
                </div>
                <div className="rightgroup">
                    <Button
                        onClick={onClickSave}
                        disabled={!changedSinceLastSave}
                        {...this.buttonProps}
                    >
                        <i className="fas fa-save fa-2x"></i>
                    </Button>  
                </div>
            </div>
        )
    }
}

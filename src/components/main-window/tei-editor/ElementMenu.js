import React, { Component } from 'react'
import { Menu, MenuItem, Typography } from '@material-ui/core'

import ElementInfoPopup from './ElementInfoPopup'
import EmptyGroup from './EmptyGroup';
import { createPhraseElement } from "../../../model/editor-actions"
import { validAction } from '../../../model/element-validators'

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            subMenuID: null,
            elementInfoID: null
        }
        this.itemEls = {}
        this.groupEls = {}
    }

    getMenuGroups() {
        const { teiDocument, menuGroup } = this.props
        if(!teiDocument) return null
        const {menus} = teiDocument.fairCopyProject.fairCopyConfig
        return menus[menuGroup]
    }

    renderElementInfo() {
        const { teiDocument } = this.props
        const { elementInfoID } = this.state
        const anchorEl = this.itemEls[elementInfoID]

        if( !elementInfoID || !anchorEl ) return null

        const { elements } = teiDocument.fairCopyProject.teiSchema
        const elementSpec = elements[elementInfoID]

        if(!elementSpec) return null
        
        return (
            <ElementInfoPopup
                elementSpec={elementSpec}
                anchorEl={()=>{ return this.itemEls[elementInfoID]}}        
            ></ElementInfoPopup>
        )
    }

    createMenuAction(selection,member) {
        return () => {
            const { teiDocument, onClose } = this.props

            if( selection && !selection.node ) {
                createPhraseElement(member, {}, teiDocument) 
            }
            onClose()
        }
    }

    renderSubMenu() {
        const { teiDocument } = this.props
        const { teiSchema } = teiDocument.fairCopyProject
        const menuGroups = this.getMenuGroups()
        const { subMenuID } = this.state
        const { members } = menuGroups[subMenuID]
        const groupEl = this.groupEls[subMenuID]

        // generate the sub menu items
        const menuItems = []

        if( members.length === 0 ) {
            const {onProjectSettings} = this.props
            menuItems.push(<EmptyGroup key="empty-group" onProjectSettings={onProjectSettings}></EmptyGroup>)
            return menuItems
        }

        for( const member of members ) {
            const editorView = teiDocument.getActiveView()
            const selection = (editorView) ? editorView.state.selection : null 

            const setItemElRef = (el) => {
                this.itemEls[member] = el
            }

            const valid = validAction( member, teiDocument )
            const onMouseOver = () => { this.setState({ ...this.state, elementInfoID: member })}
            const onMouseLeave = () => { this.setState({ ...this.state, elementInfoID: null })}
            const icon = teiSchema.getElementIcon(member)
            const nameEl = icon ? <span><i className={`${icon} fa-sm`}></i><span className="element-menu-name">{member}</span></span> : <span>{member}</span>

            menuItems.push(
                <MenuItem 
                    ref={setItemElRef}
                    key={`submenu-${member}`}
                    disabled={!valid}
                    disableRipple={true}
                    onMouseOver={onMouseOver}
                    onMouseLeave={onMouseLeave}
                    onClick={this.createMenuAction(selection, member)}
                >
                    {nameEl}
                </MenuItem>
            )
        }

        const anchorOrigin = { vertical: 'top', horizontal: 'right' }

        const onClose = () => { 
            this.itemEls = {}
            this.setState({...this.state, subMenuID: null})
        }

        return (
            <Menu
                open={true}
                onClose={onClose}
                anchorEl={groupEl}
                anchorOrigin={anchorOrigin}
                getContentAnchorEl={null}
            >
                { menuItems }
            </Menu>
        )
    }

    renderMenuItems() {
        const menuGroups = this.getMenuGroups()

        // generate the menu items
        const menuItems = []
        let i=0
        for( const menuGroup of menuGroups ) {
            const menuID = i
            const key = `menugroup-${menuID}`
            const showMenu = () => { this.setState({ subMenuID: menuID }) }
            menuItems.push(
                <MenuItem 
                    key={key} 
                    ref={(el)=> { this.groupEls[menuID] = el }}
                    disableRipple={true}
                    className="menu-item"
                    onClick={showMenu}
                    value={i++}
                >                   
                    <Typography>{menuGroup.label} <i className="menu-chevron fas fa-chevron-right"></i></Typography>
                </MenuItem>
            )
        }

        return menuItems
    }

    render() {  
        const { elementMenuAnchors, menuGroup, onClose } = this.props
        const { subMenuID } = this.state
        const anchorEl = elementMenuAnchors[menuGroup]
        const anchorOrigin = { vertical: 'bottom', horizontal: 'left' }

        return (
            <div id="ElementMenu">
                <Menu
                    open={true}
                    onClose={onClose}
                    anchorEl={anchorEl}
                    anchorOrigin={anchorOrigin}
                    getContentAnchorEl={null}
                >
                    { this.renderMenuItems() }
                </Menu>
                { subMenuID !== null && this.renderSubMenu() }
                { this.renderElementInfo() }
            </div>
        )
    }

}
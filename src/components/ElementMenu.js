import React, { Component } from 'react'
import { Menu, MenuItem } from '@material-ui/core'

import NestedMenuItem from './NestedMenuItem';
import ElementInfoPopup from './ElementInfoPopup'
import { createPhraseElement } from "../tei-document/editor-actions"

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            elementInfoID: null
        }
        this.itemEls = {}
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

    renderGroup(menuGroup) {
        const { teiDocument } = this.props
        const { elements } = teiDocument.fairCopyProject.teiSchema
        const {members} = menuGroup

        // generate the sub menu items
        const menuItems = []
        for( const member of members ) {
            const editorView = teiDocument.getActiveView()
            const selection = (editorView) ? editorView.state.selection : null 

            const setItemElRef = (el) => {
                this.itemEls[member] = el
            }

            // const valid = !member.enabled ? false : validAction('mark', member.id, teiDocument, selection )
            const onMouseOver = () => { this.setState({ ...this.state, elementInfoID: member })}
            const onMouseLeave = () => { this.setState({ ...this.state, elementInfoID: null })}
            const elementSpec = elements[member]
            const icon = elementSpec ? elementSpec.icon : null
            const nameEl = icon ? <span><i className={`far ${icon} fa-sm`}></i><span className="element-menu-name">{member}</span></span> : <span>{member}</span>

            menuItems.push(
                <MenuItem 
                    ref={setItemElRef}
                    key={`submenu-${member}`}
                    disableRipple={true}
                    onMouseOver={onMouseOver}
                    onMouseLeave={onMouseLeave}
                    onClick={this.createMenuAction(selection, member)}
                >
                    {nameEl}
                </MenuItem>
            )
        }

        return menuItems
    }

    renderGroups() {
        const menuGroups = this.getMenuGroups()

        // generate the menu items
        const menuItems = []
        for( const menuGroup of Object.values(menuGroups) ) {
            const menuGroupID = menuGroup.id
            const key = `menugroup-${menuGroupID}`
            menuItems.push(
                <NestedMenuItem 
                    key={key} 
                    disableRipple={true}
                    mainMenuOpen={true}
                    className="menu-item"
                    value={menuGroupID}
                    label={menuGroup.label}
                    rightIcon={<i className="menu-chevron fas fa-chevron-right"></i>}
                >
                    { this.renderGroup(menuGroup) }
                </NestedMenuItem>
            )
        }

        return menuItems
    }

    render() {  
        const { elementMenuAnchors, menuGroup, onClose } = this.props
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
                    { this.renderGroups() }
                </Menu>
                { this.renderElementInfo() }
            </div>
        )
    }

}
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
        if( !teiDocument || !menuGroup ) return []
        const {menus} = teiDocument.fairCopyProject.fairCopyConfig
        return menus[menuGroup]
    }

    renderElementInfo() {
        const { teiDocument } = this.props
        const { elementInfoID } = this.state
        const anchorEl = this.itemEls[elementInfoID]

        if( elementInfoID === null || !anchorEl ) return null

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
        const { subMenuID } = this.state
        if( subMenuID === null ) return null

        const { teiDocument, open } = this.props
        const { teiSchema } = teiDocument.fairCopyProject
        const menuGroups = this.getMenuGroups()
        if( menuGroups.length === 0 ) return null

        const { members } = menuGroups[subMenuID]
        const groupEl = this.groupEls[subMenuID]

        if( !groupEl ) return null

        // generate the sub menu items
        const menuItems = []

        if( members.length === 0 ) {
            const {onProjectSettings} = this.props
            menuItems.push(<EmptyGroup key="empty-group" onProjectSettings={onProjectSettings}></EmptyGroup>)
            return menuItems
        }

        const onClose = () => { 
            this.itemEls = {}
            this.setState({...this.state, subMenuID: null})
        }

        for( const member of members ) {
            const editorView = teiDocument.getActiveView()
            const selection = (editorView) ? editorView.state.selection : null 

            const setItemElRef = (el) => {
                this.itemEls[member] = el
            }

            const valid = validAction( member, teiDocument )
            const onShowInfo = () => { this.setState({ ...this.state, elementInfoID: member })}
            const onHideInfo = () => { this.setState({ ...this.state, elementInfoID: null })}
            const onKeyUp = (e) => { 
                // left arrow
                if( e.keyCode === 37 ) onClose()
            }
            const icon = teiSchema.getElementIcon(member)
            const nameEl = icon ? <span><i className={`${icon} fa-sm`}></i><span className="element-menu-name">{member}</span></span> : <span>{member}</span>

            menuItems.push(
                <MenuItem 
                    ref={setItemElRef}
                    key={`submenu-${member}`}
                    disabled={!valid}
                    disableRipple={true}
                    onFocus={onShowInfo}
                    onBlur={onHideInfo}
                    onMouseOver={onShowInfo}
                    onMouseLeave={onHideInfo}
                    onClick={this.createMenuAction(selection, member)}
                    onKeyUp={onKeyUp}
                >
                    {nameEl}
                </MenuItem>
            )
        }

        const anchorOrigin = { vertical: 'top', horizontal: 'right' }

        return (
            <Menu
                open={open}
                onClose={onClose}
                anchorEl={groupEl}
                anchorOrigin={anchorOrigin}
                transitionDuration={0}
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
            const onKeyUp = (e) => { 
                // right arrow
                if( e.keyCode === 39 ) showMenu()
            }
            menuItems.push(
                <MenuItem 
                    key={key} 
                    ref={(el)=> { this.groupEls[menuID] = el }}
                    disableRipple={true}
                    className="menu-item"
                    onKeyUp={onKeyUp}
                    onClick={showMenu}
                    value={i++}
                >                   
                    <Typography>{menuGroup.label} </Typography><div className="menu-chevron" ><i className="fas fa-chevron-right"></i></div>
                </MenuItem>
            )
        }

        return menuItems
    }

    render() {  
        const { elementMenuAnchors, menuGroup, onClose, open } = this.props
        const anchorEl = elementMenuAnchors[menuGroup]
        const anchorOrigin = { vertical: 'bottom', horizontal: 'left' }

        // return focus to active editor after menu closes
        const onExited = () => {
            const { teiDocument } = this.props
            const editorView = teiDocument.getActiveView()
            editorView.focus()
        }

        return (
            <div id="ElementMenu">
                <Menu
                    open={open}
                    onClose={onClose}
                    anchorEl={anchorEl}
                    anchorOrigin={anchorOrigin}
                    getContentAnchorEl={null}
                    TransitionProps={ {onExited} }
                >
                    { this.renderMenuItems() }
                </Menu>
                { this.renderSubMenu() }
                { this.renderElementInfo() }
            </div>
        )
    }

}
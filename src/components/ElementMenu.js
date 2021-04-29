import React, { Component } from 'react'
import { Menu, MenuItem } from '@material-ui/core'

import NestedMenuItem from './NestedMenuItem';
import ElementInfoPopup from './ElementInfoPopup'
import { validAction, createElement, addInside, addBelow, addAbove, addOutside, replaceElement, determineRules } from "../tei-document/editor-actions"

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
        const menus = teiDocument.resourceType === 'header' ? teiDocument.fairCopyProject.headerMenus : teiDocument.fairCopyProject.menus
        return menus[menuGroup]
    }

    renderElementInfo() {
        const { teiDocument, menuGroup } = this.props
        const { elementInfoID } = this.state
        const anchorEl = this.itemEls[elementInfoID]

        if( !elementInfoID || !anchorEl ) return null

        const { elements } = teiDocument.fairCopyProject.teiSchema
        const elementSpec = elements[elementInfoID]

        if(!elementSpec) return null

        // element info mouse events
        // const onMouseOver = () => {
        //     this.setState({...this.state, activeMenu: 'info' })
        // }
        // const onMouseLeave = () => {
        //     this.setState({...this.state, activeMenu: null })
        //     this.checkActiveMenu()
        // }
        
        // get the text for the structure rules
        const rules = menuGroup === 'structure' ? determineRules(elementInfoID,teiDocument) : {}

        return (
            <ElementInfoPopup
                // onMouseOver={onMouseOver}
                // onMouseLeave={onMouseLeave}
                elementSpec={elementSpec}
                anchorEl={()=>{ return this.itemEls[elementInfoID]}}        
                { ...rules }    
            ></ElementInfoPopup>
        )
    }

    createMenuAction(selection,member) {
        const { action, teiDocument, onAlertMessage, onClose } = this.props
        const editorView = teiDocument.getActiveView()

        return () => {
            if( action === 'info' ) return

            if( selection ) {
                if( selection.node ) {
                    try {
                        switch(action) {
                            case 'replace': {
                                const tr = replaceElement(member.id, teiDocument, selection.anchor) 
                                editorView.dispatch(tr)
                                break
                            }
                            case 'addAbove': {
                                const tr = addAbove(member.id, teiDocument, selection.anchor) 
                                tr.scrollIntoView()
                                editorView.dispatch(tr)
                                editorView.focus()  
                                break
                            }
                            case 'addBelow': {
                                const tr = addBelow(member.id, teiDocument, selection.anchor) 
                                tr.scrollIntoView()
                                editorView.dispatch(tr)
                                editorView.focus()  
                                break
                            }
                            case 'addInside': {
                                const tr = addInside(member.id, teiDocument, selection.anchor) 
                                tr.scrollIntoView()
                                editorView.dispatch(tr)
                                editorView.focus()            
                                break
                            }
                            case 'addOutside': {
                                const tr = addOutside(member.id, teiDocument, selection.anchor) 
                                tr.scrollIntoView()
                                editorView.dispatch(tr)
                                editorView.focus()   
                                break
                            }
                            default:
                                throw new Error('Unknown action type selected in ElementMenu')
                        }    
                    } catch(err) {
                        onAlertMessage(err.message)
                    }
                } else {
                    createElement(member.id, teiDocument) 
                }
            }

            onClose()
        }
    }

    renderGroup(menuGroup) {
        const { teiDocument, action } = this.props
        const {members} = menuGroup

        // generate the sub menu items
        const menuItems = []
        for( const member of members ) {
            const editorView = teiDocument.getActiveView()
            const selection = (editorView) ? editorView.state.selection : null 

            const setItemElRef = (el) => {
                this.itemEls[member.id] = el
            }

            const valid = !member.enabled ? false : validAction(action, member.id, teiDocument, selection )
            const onMouseOver = () => { this.setState({ ...this.state, elementInfoID: member.id })}
            const onMouseLeave = () => { this.setState({ ...this.state, elementInfoID: null })}
            const mouseEvents = (action === 'info') ? { onMouseOver, onMouseLeave } : { onClick: this.createMenuAction(selection, member) }

            menuItems.push(
                <MenuItem 
                    disabled={!valid} 
                    ref={setItemElRef}
                    key={`submenu-${member.id}`}
                    disableRipple={true}
                    { ...mouseEvents }
                >
                    {member.id}
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
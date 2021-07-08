import React, { Component } from 'react'
import { DragDropContext } from "react-beautiful-dnd";

import ElementTree from './ElementTree'
import ElementInspector from './ElementInspector'
import ElementLibrary from './ElementLibrary'
import AttributeDialog from '../main-window/dialogs/AttributeDialog'
import SettingsDraggingElement from './SettingsDraggingElement'
import EditGroupDialog from './EditGroupDialog'
import { reorder } from '../common/dnd';

import { addElementToMenu, removeElementFromMenu  } from '../../model/faircopy-config'

export default class SchemaEditor extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedElement: null,
            selectedGroup: null,
            selectedMenu: 'structure',
            attributeDialogOpen: false,
            draggingElementActive: false,
            editGroupOpen: false,
            draggedAwayElementID: null,
            hoverOverElementID: null,
            dragInfo: null
        }
    }

    onDragElement = (elementID, clientOffset, startingPoint, originGroupID ) => {
        const dragInfo = { elementID, clientOffset, startingPoint, originGroupID }
        this.setState( {...this.state, draggingElementActive: true, dragInfo })
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig } = this.props
        const { selectedElement, attributeDialogOpen, draggingElementActive, draggedAwayElementID, hoverOverElementID, dragInfo, selectedGroup, selectedMenu, editGroupOpen, groupIndex } = this.state

        const onSelect = (elementID,groupID) => {
            this.setState({...this.state, selectedElement: elementID, selectedGroup: groupID })
        }

        const onChangeMenu = (e,nextMenu) => {
            this.setState({...this.state, selectedMenu: nextMenu })
        }

        const closeAttributeDialog = () => {
            this.setState({...this.state, attributeDialogOpen: false })
        }

        const openAttributeDialog = () => {
            this.setState({...this.state, attributeDialogOpen: true })
        }

        const onEditGroup = ( groupIndex ) => {
            this.setState({...this.state, groupIndex, editGroupOpen: true })
        }

        const onRemoveElement = () => {
            removeElementFromMenu(selectedElement,selectedGroup,selectedMenu,fairCopyConfig)
            this.setState({...this.state, selectedElement: null, selectedGroup: null })
            onUpdateConfig(fairCopyConfig)
        }

        const onDragEnd = (result) => {
            if (!result.destination) return

            if( result.type === 'groups' ) {
                const elementGroups = fairCopyConfig.menus[selectedMenu]
                const nextElementGroups = reorder(
                    elementGroups,
                    result.source.index,
                    result.destination.index
                )
                
                fairCopyConfig.menus[selectedMenu] = nextElementGroups
                onUpdateConfig(fairCopyConfig)    
            } else {
                // translate result from DnD
                const { draggableId } = result
                const { droppableId: originGroupID } = result.source
                const { droppableId: groupID, index: palettePos } = result.destination
                const idToIndex = (id) => id.startsWith('group-') ? parseInt(id.slice('group-'.length)) : null
                const elementID = draggableId.slice(draggableId.indexOf('-')+1)
                const originGroupIndex = idToIndex(originGroupID)
                const groupIndex = idToIndex(groupID)

                // dragged to library, ignore
                if( !groupIndex ) return

                // update the effected group(s)
                if( originGroupIndex !== null ) removeElementFromMenu( elementID, originGroupIndex, selectedMenu, fairCopyConfig)
                const addResult = addElementToMenu( elementID, palettePos, groupIndex, selectedMenu, fairCopyConfig)
                if( addResult.error ) {
                    console.log(addResult.message)
                } else {
                    onUpdateConfig( fairCopyConfig )
                }  
            }
        }

        const style = draggingElementActive ? { cursor: 'none' } : {}

        return (
            <div id="SchemaEditor" style={style}>
                <div className="top">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="top-left">
                            <ElementTree
                                teiSchema={teiSchema}
                                fairCopyConfig={fairCopyConfig}
                                selectedMenu={selectedMenu}
                                draggedAwayElementID={draggedAwayElementID}
                                hoverOverElementID={hoverOverElementID}
                                onSelect={onSelect}
                                onDragElement={this.onDragElement}
                                onChangeMenu={onChangeMenu}
                                onEditGroup={onEditGroup}
                                onUpdateConfig={onUpdateConfig}
                            ></ElementTree>
                        </div>
                        <div className="top-right">
                            <ElementLibrary
                                teiSchema={teiSchema}
                                selectedMenu={selectedMenu}
                                onSelect={onSelect}
                                onDragElement={this.onDragElement}
                            ></ElementLibrary>
                        </div>
                    </DragDropContext>
                </div>
                <div className="bottom">
                    <ElementInspector
                        teiSchema={teiSchema}
                        fairCopyConfig={fairCopyConfig}
                        elementID={selectedElement}
                        onMenu={selectedGroup !== null}
                        onRemoveElement={onRemoveElement}
                        openAttributeDialog={openAttributeDialog}
                        onUpdateConfig={onUpdateConfig}
                    ></ElementInspector>
                </div>
                <div>
                    { attributeDialogOpen && <AttributeDialog 
                        elementName={selectedElement}
                        fairCopyConfig={fairCopyConfig}
                        teiSchema={teiSchema} 
                        open={attributeDialogOpen} 
                        onUpdateConfig={onUpdateConfig}
                        onClose={closeAttributeDialog} 
                    ></AttributeDialog> }
                    { editGroupOpen && <EditGroupDialog
                        groupIndex={groupIndex}
                        menuID={selectedMenu}
                        fairCopyConfig={fairCopyConfig}
                        onUpdateConfig={onUpdateConfig}
                        onClose={() => { this.setState( { ...this.state, editGroupOpen: false }) }}
                    ></EditGroupDialog>}
                    { draggingElementActive && <SettingsDraggingElement
                        fairCopyConfig={fairCopyConfig}
                        elementID={dragInfo.elementID}
                        originGroupID={dragInfo.originGroupID}
                        startingPoint={dragInfo.startingPoint}
                        clientOffset={dragInfo.clientOffset}
                        onUpdateConfig={onUpdateConfig}
                        enableDragAway={dragInfo.originGroupID !== -1}
                        onDraggedAway={()=>{ this.setState( { ...this.state, draggedAwayElementID: dragInfo.elementID })}}
                        onHover={(hoverOverElementID)=>{ this.setState( { ...this.state, hoverOverElementID })}}
                        onDrop={()=>{ this.setState( {...this.state, dragInfo: null, dragging: false, draggingElementActive: false, draggedAwayElementID: null} )}}
                    ></SettingsDraggingElement> }

                </div>
            </div>
        )
    }
}

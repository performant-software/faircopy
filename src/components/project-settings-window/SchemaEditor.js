import React, { Component } from 'react'
import { DragDropContext } from "react-beautiful-dnd";

import ElementTree from './ElementTree'
import ElementInspector from './ElementInspector'
import ElementLibrary from './ElementLibrary'
import AttributeDialog from '../main-window/dialogs/AttributeDialog'
import EditGroupDialog from './EditGroupDialog'
import { reorder } from '../common/dnd';
import SnackAlert from '../common/SnackAlert'

import { addElementToMenu, removeElementFromMenu  } from '../../model/faircopy-config'

export default class SchemaEditor extends Component {

    constructor(props) {
        super(props)

        this.state = {
            alertMessage: null,
            selectedElement: null,
            selectedGroup: null,
            selectedMenu: 'structure',
            attributeDialogOpen: false,
            editGroupOpen: false
        }
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig } = this.props
        const { selectedElement, attributeDialogOpen, selectedGroup, selectedMenu, editGroupOpen, groupIndex, alertMessage } = this.state

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

        const onAlertMessage = (message) => {
            this.setState({...this.state, alertMessage: message })
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
                if( groupIndex === null ) return

                // update the effected group(s)
                if( originGroupIndex !== null ) removeElementFromMenu( elementID, originGroupIndex, selectedMenu, fairCopyConfig)
                const addResult = addElementToMenu( elementID, palettePos, groupIndex, selectedMenu, fairCopyConfig)
                if( addResult.error ) {
                    onAlertMessage(addResult.message)
                } else {
                    onUpdateConfig( fairCopyConfig )
                }  
            }
        }

        return (
            <div id="SchemaEditor">
                <div className="top">
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="top-left">
                            <ElementTree
                                teiSchema={teiSchema}
                                fairCopyConfig={fairCopyConfig}
                                selectedElement={ selectedGroup !== null ? selectedElement : null }
                                selectedGroup={selectedGroup}
                                selectedMenu={selectedMenu}
                                onSelect={onSelect}
                                onChangeMenu={onChangeMenu}
                                onEditGroup={onEditGroup}
                                onUpdateConfig={onUpdateConfig}
                            ></ElementTree>
                        </div>
                        <div className="top-right">
                            <ElementLibrary
                                teiSchema={teiSchema}
                                selectedElement={ selectedGroup === null ? selectedElement : null}
                                selectedMenu={selectedMenu}
                                onSelect={onSelect}
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
                    <SnackAlert
                        open={alertMessage !== null}
                        message={alertMessage}
                        handleClose={()=>{ this.setState({...this.state, alertMessage: null})}}
                    ></SnackAlert>
                </div>
            </div>
        )
    }
}

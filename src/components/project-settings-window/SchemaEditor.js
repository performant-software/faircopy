import React, { Component } from 'react'
import { DragDropContext } from "react-beautiful-dnd";

import ElementTree from './ElementTree'
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
            this.setState({...this.state, selectedElement: elementID, selectedGroup: groupID,  attributeDialogOpen: true })
        }

        const onChangeMenu = (e,nextMenu) => {
            this.setState({...this.state, selectedMenu: nextMenu })
        }

        const closeAttributeDialog = () => {
            this.setState({...this.state, attributeDialogOpen: false, selectedElement: null, selectedGroup: null })
        }

        const onAlertMessage = (message) => {
            this.setState({...this.state, alertMessage: message })
        }

        const onEditGroup = ( groupIndex ) => {
            this.setState({...this.state, groupIndex, editGroupOpen: true })
        }

        const onDragEnd = (result) => {
            const idToIndex = (id) => id.startsWith('group-') ? parseInt(id.slice('group-'.length)) : null

            if (!result.destination) {
                // if dragged away, remove element from menu
                const { draggableId } = result
                const { droppableId: originGroupID } = result.source
                const elementID = draggableId.slice(draggableId.indexOf('-')+1)
                const originGroupIndex = idToIndex(originGroupID)
                removeElementFromMenu( elementID, originGroupIndex, selectedMenu, fairCopyConfig)
                this.setState({...this.state, selectedElement: null, selectedGroup: null })
                onUpdateConfig(fairCopyConfig)   
                return
            }

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
                            ></ElementLibrary>
                        </div>
                    </DragDropContext>
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

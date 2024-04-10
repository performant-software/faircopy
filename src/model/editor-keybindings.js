import { createPhraseElement } from "./editor-actions"

export const teiEditorKeyMap = {
    onTogglePalette: '1+Control',
    onOpenMarkMenu: '2+Control',
    onOpenInineMenu: '3+Control',
    eraseSelection: '4+Control',
    undo: 'Control+z',
    redo: 'Control+Shift+z',
    cutSelectedNode: 'Control+x',
    openSearchBar: 'f+Control',
    closeSearchBar: 'Escape',
    // TODO fixme
    // copySelectedNode: 'Meta+v'
}

export function getHotKeyConfig( teiDocument, teiEditorHandlers ) {
    const { projectKeyMap, projectHanders } = getProjectHotKeys( teiDocument )

    const keyMap = {
        ...teiEditorKeyMap,
        ...projectKeyMap
    }
      
    const handlers = {
        ...teiEditorHandlers,
        ...projectHanders
    }
    
    return { keyMap, handlers }
}

function getProjectHotKeys( teiDocument ) {
    const { keybindings } = teiDocument.fairCopyProject.fairCopyConfig

    const projectKeyMap = {}, projectHanders = {}

    if( keybindings ) {
        let n = 0
        for( const chord of Object.keys(keybindings) ) {
            const actionName = `userDefined_${n++}`
            const keybinding = keybindings[chord]
            const { elementName } = keybinding
    
            projectKeyMap[actionName] = chord
            projectHanders[actionName] = () => {
                createPhraseElement( elementName, {}, teiDocument )
            }
        }    
    }

    return { projectKeyMap, projectHanders }
}
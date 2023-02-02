import { createPhraseElement } from "./editor-actions"

export const teiEditorKeyMap = {
    onTogglePalette: '1+Meta',
    onOpenMarkMenu: '2+Meta',
    onOpenInineMenu: '3+Meta',
    eraseSelection: '4+Meta',
    undo: 'Meta+z',
    redo: 'Meta+Shift+z',
    cutSelectedNode: 'Meta+x',
    copySelectedNode: 'Meta+v'
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

    return { projectKeyMap, projectHanders }
}
import { createPhraseElement } from "./editor-actions"

const fairCopy = window.fairCopy

const platform = fairCopy.getPlatform()

const windowsKeyMap = {
    onTogglePalette: '1+Control',
    onOpenMarkMenu: '2+Control',
    onOpenInineMenu: '3+Control',
    eraseSelection: '4+Control',
    undo: 'Control+z',
    redo: 'Control+Shift+z',
    cutSelectedNode: 'Control+x',
    copySelectedNode: 'Control+c',
    openSearchBar: 'Control+f',
    closeSearchBar: 'Escape',
}

const macKeyMap = {
    onTogglePalette: '1+Meta',
    onOpenMarkMenu: '2+Meta',
    onOpenInineMenu: '3+Meta',
    eraseSelection: '4+Meta',
    undo: 'Meta+z',
    redo: 'Meta+Shift+z',
    cutSelectedNode: 'Meta+x',
    copySelectedNode: 'Meta+c',
    openSearchBar: 'Meta+f',
    closeSearchBar: 'Escape',
}

export const teiEditorKeyMap = ( platform === 'win32' ) ? windowsKeyMap : macKeyMap 

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
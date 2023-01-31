import { createPhraseElement } from "./editor-actions"

export const teiEditorKeyMap = {
    onTogglePalette: '1+meta',
    onOpenMarkMenu: '2+meta',
    onOpenInineMenu: '3+meta',
    eraseSelection: '4+meta',
    undo: 'meta+z',
    redo: 'meta+shift+z',
    cutSelectedNode: 'meta+x',
    copySelectedNode: 'meta+v'
}

export function getHotKeyConfig( teiDocument, teiEditorHandlers ) {
    const projectKeyMap = [], projectHanders = []

    projectKeyMap.testMark = 'meta+p'
    projectHanders.testMark = () => {
        createPhraseElement( 'persName', {}, teiDocument )
    }

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
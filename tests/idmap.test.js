const { createIDMapAuthority } = require('../public/main-process/IDMapAuthority')
const { getBlankResourceMap } = require('../public/main-process/id-map-authority')
const { v4: uuidv4 } = require('uuid')

test('test local move resource', () => {
    const onUpdate = jest.fn();
    const idMap = createIDMapAuthority(false, "{}", onUpdate ) 
    
    const parentResourceID = uuidv4()
    const nextParentID = uuidv4()
    idMap.addResource( 'testDoc', null, getBlankResourceMap(parentResourceID, 'teidoc'))
    idMap.addResource( 'images', 'testDoc', getBlankResourceMap(uuidv4(), 'facs') )
    idMap.addResource( 'transcription', 'testDoc', getBlankResourceMap(uuidv4(), 'sourceDoc') )
    idMap.addResource( 'translation', 'testDoc', getBlankResourceMap(uuidv4(), 'text') )
    idMap.addResource( 'nextParent', null, getBlankResourceMap(nextParentID, 'teidoc'))
    idMap.sendIDMapUpdate() 

    expect(onUpdate).toHaveBeenCalled()
    expect(Object.keys(idMap.idMap).length).toBe(2)
    expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(3)
    expect(Object.keys(idMap.idMap['nextParent'].ids).length).toBe(0)

    idMap.moveResourceMap( 'translation', 'translation', nextParentID, parentResourceID )
    idMap.sendIDMapUpdate() 

    expect(onUpdate).toHaveBeenCalled()
    expect(Object.keys(idMap.idMap).length).toBe(2)
    expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(2)
    expect(Object.keys(idMap.idMap['nextParent'].ids).length).toBe(1)
})
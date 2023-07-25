const { getBlankResourceMap } = require('../public/main-process/id-map-authority')
const { IDMapRemote } = require('../public/main-process/IDMapRemote')
const { v4: uuidv4 } = require('uuid')

describe('Exercise the functions of the IDMapRemote module', () => {
    const onUpdate = jest.fn();
    const idMap = new IDMapRemote("{}", onUpdate) 
    const { resourceEntries, resourceMaps } = createResourceTestData()

    test('test addResource', () => {
        const { localID: parentLocalID } = resourceEntries['parent']
        idMap.addResource( parentLocalID, null, resourceMaps['parent'])
        idMap.addResource( 'images', parentLocalID, resourceMaps['images'] )
        idMap.addResource( 'transcription', parentLocalID, resourceMaps['transcription'] )
        idMap.addResource( 'franslation', parentLocalID, resourceMaps['translation'] )
        idMap.sendIDMapUpdate()

        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(3)
    })

    test('test removeResources', () => {
        idMap.removeResources([ resourceMaps['transcription'].resourceID ])

        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids['transcription']).deleted)
    })

    // test('test recoverResources', () => {
    //     idMap.recoverResources([ resourceMaps['transcription'].resourceID ])

    //     expect(Object.keys(idMap.idMap).length).toBe(1)
    //     expect(!Object.keys(idMap.idMap['testDoc'].ids['transcription']).deleted)
    // })

    test('test changeID', () => {
        idMap.changeID( 'translation', 'franslation', 'testDoc' )
        idMap.changeID( 'testDocument', 'testDoc' )
        resourceEntries['parent'].localID = 'testDocument'
        resourceEntries['translation'].localID = 'translation'
        idMap.sendIDMapUpdate()

        expect(!!Object.keys(idMap.idMap['testDocument'].ids['translation']))
    })

    test('test moveResourceMap', () => {
        idMap.moveResourceMap( 'translation2', 'translation', null, resourceMaps['parent'].resourceID )
        resourceEntries['translation'].localID = 'translation2'
        resourceEntries['translation'].parentResource = null
        idMap.sendIDMapUpdate() 

        expect(Object.keys(idMap.idMap).length).toBe(2)
        expect(Object.keys(idMap.idMap['testDocument'].ids).length).toBe(2)
        expect(!!Object.keys(idMap.idMap['translation2']))
    })

    test('test checkIn', () => {
        idMap.checkIn([ resourceEntries['transcription'] ])

        expect(Object.keys(idMap.idMapBase).length).toBe(1)
        expect(Object.keys(idMap.idMapBase['testDocument'].ids).length).toBe(1)
        expect(Object.keys(idMap.idMapStaged).length).toBe(2)
    })

    test('test checkOut and commit', () => {
        const resourceEntry = resourceEntries['transcription']
        const parentEntry = resourceEntries['parent']
        const checkOutResults = { 'transcription': { state: 'success', resourceEntry, parentEntry, content: ""} }
        idMap.checkOut(checkOutResults)
        idMap.setResourceMap( resourceMaps['transcription'], resourceEntry.localID, parentEntry.localID )
        idMap.commitResource( resourceEntry.localID, parentEntry.localID )

        expect(Object.keys(idMap.idMapBase).length).toBe(1)
        expect(Object.keys(idMap.idMapBase['testDocument'].ids).length).toBe(1)
        expect(Object.keys(idMap.idMapStaged).length).toBe(2)       
    })

    // while processing the checkIn results from a child resource deletion, the child resource 
    // is not in the idMapStaged map. The child resource is a facs type. 
    test('test committing a resource that has no changes', () => {
        const { localID: parentLocalID } = resourceEntries['parent']        
        idMap.commitResource('images',parentLocalID)
        expect(idMap.idMapStaged['testDocument'].ids['images']).not.toBe(undefined)
    })
})


function createResourceEntry( localID, name, type, parentResource ) {
    return {
        id: uuidv4(),
        localID,
        name, 
        type,
        parentResource,
        local: true,
        deleted: false,
        gitHeadRevision: null,
        lastAction: null
    }
}

function createResourceTestData() {
    const resourceEntries = {}, resourceMaps = {}

    resourceEntries['parent'] = createResourceEntry( 'testDoc', 'testDoc', 'teidoc', null )
    const parentResourceID = resourceEntries['parent'].id
    resourceMaps['parent'] = getBlankResourceMap( parentResourceID, 'teidoc')

    resourceEntries['images'] = createResourceEntry( 'images', 'images', 'facs', parentResourceID )
    resourceMaps['images'] = getBlankResourceMap(resourceEntries['images'].id, 'facs')
    resourceMaps['images'].ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
 
    resourceEntries['images2'] = createResourceEntry( 'images2', 'images2', 'facs', parentResourceID )
    resourceMaps['images2'] = getBlankResourceMap(resourceEntries['images2'].id, 'facs')
    resourceMaps['images2'].ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
 
    resourceEntries['transcription'] = createResourceEntry( 'transcription', 'transcription', 'text', parentResourceID )
    resourceMaps['transcription'] = getBlankResourceMap(resourceEntries['transcription'].id, 'text')
    resourceMaps['transcription'].ids['div-a'] = { type: 'text', useCount: 1 }
    resourceMaps['transcription'].ids['div-b'] = { type: 'text', useCount: 1 }
    
    resourceEntries['translation'] = createResourceEntry( 'translation', 'franslation', 'text', parentResourceID )
    resourceMaps['translation'] = getBlankResourceMap(resourceEntries['translation'].id, 'text')
        
    return { resourceEntries, resourceMaps }
}

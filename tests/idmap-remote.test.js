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
        idMap.sendIDMapUpdate()

        expect(!!Object.keys(idMap.idMap['testDocument'].ids['translation']))
    })

    test('test moveResourceMap', () => {
        idMap.moveResourceMap( 'translation2', 'translation', null, resourceMaps['parent'].resourceID )
        idMap.sendIDMapUpdate() 

        expect(Object.keys(idMap.idMap).length).toBe(2)
        expect(Object.keys(idMap.idMap['testDocument'].ids).length).toBe(2)
        expect(!!Object.keys(idMap.idMap['translation2']))
    })

    test('test checkIn', () => {
        idMap.checkIn(Object.values(resourceEntries))

        expect(Object.keys(idMap.idMapBase).length).toBe(1)
        expect(Object.keys(idMap.idMapBase['testDocument'].ids).length).toBe(2)
        expect(Object.keys(idMap.idMapStaged).length).toBe(1)
    })

    test('test checkOut', () => {
        // TODO
    })

    test('test commitResource', () => {
        // TODO
    })
})


function createResourceEntry( localID, name, type ) {
    return {
        id: uuidv4(),
        localID,
        name, 
        type,
        parentResource: null,
        local: true,
        deleted: false,
        gitHeadRevision: null,
        lastAction: null
    }
}

function createResourceTestData() {
    const resourceEntries = {}, resourceMaps = {}

    resourceMaps['images'] = getBlankResourceMap(uuidv4(), 'facs')
    resourceMaps['images'].ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
    resourceMaps['images'].ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
    resourceEntries['images'] = createResourceEntry( 'images', 'images', 'facs' )
    
    resourceMaps['transcription'] = getBlankResourceMap(uuidv4(), 'text')
    resourceMaps['transcription'].ids['div-a'] = { type: 'text', useCount: 1 }
    resourceMaps['transcription'].ids['div-b'] = { type: 'text', useCount: 1 }
    resourceEntries['transcription'] = createResourceEntry( 'transcription', 'transcription', 'text' )
    
    resourceMaps['translation'] = getBlankResourceMap(uuidv4(), 'text')
    resourceEntries['translation'] = createResourceEntry( 'translation', 'translation', 'text' )
    
    resourceEntries['parent'] = createResourceEntry( 'testDoc', 'testDoc', 'teidoc' )
    resourceMaps['parent'] = getBlankResourceMap(resourceEntries['parent'].id, 'teidoc')
    
    return { resourceEntries, resourceMaps }
}

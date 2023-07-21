const { getBlankResourceMap } = require('../public/main-process/id-map-authority')
const { IDMapRemote } = require('../public/main-process/IDMapRemote')
const { v4: uuidv4 } = require('uuid')

describe('Exercise the functions of the IDMapRemote module', () => {
    const onUpdate = jest.fn();
    const idMap = new IDMapRemote("{}", onUpdate) 
    
    const imagesResourceMap = getBlankResourceMap(uuidv4(), 'facs')
    imagesResourceMap.ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
    imagesResourceMap.ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
    const transcriptionResourceMap = getBlankResourceMap(uuidv4(), 'text')
    transcriptionResourceMap.ids['div-a'] = { type: 'text', useCount: 1 }
    transcriptionResourceMap.ids['div-b'] = { type: 'text', useCount: 1 }
    const translationResourceMap = getBlankResourceMap(uuidv4(), 'text')
    const parentResourceEntry = {
        id: uuidv4(),
        localID: 'testDoc',
        name: 'testDoc', 
        type: 'teidoc',
        parentResource: null,
        local: true,
        deleted: false,
        gitHeadRevision: null,
        lastAction: null
    }
    const parentResourceMap = getBlankResourceMap(parentResourceEntry.id, parentResourceEntry.type)

    test('test addResource', () => {
        idMap.addResource( parentResourceEntry.localID, null, parentResourceMap)
        idMap.addResource( 'images', parentResourceEntry.localID, imagesResourceMap )
        idMap.addResource( 'transcription', parentResourceEntry.localID, transcriptionResourceMap )
        idMap.addResource( 'franslation', parentResourceEntry.localID, translationResourceMap )
        idMap.sendIDMapUpdate()

        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(3)
    })

    test('test removeResources', () => {
        idMap.removeResources([ transcriptionResourceMap.resourceID ])

        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids['transcription']).deleted)
    })

    // test('test recoverResources', () => {
    //     idMap.recoverResources([ transcriptionResourceMap.resourceID ])

    //     expect(Object.keys(idMap.idMap).length).toBe(1)
    //     expect(!Object.keys(idMap.idMap['testDoc'].ids['transcription']).deleted)
    // })

    test('test changeID', () => {
        idMap.changeID( 'translation', 'franslation', 'testDoc' )
        idMap.changeID( 'testDocument', 'testDoc' )
        parentResourceEntry.localID = 'testDocument'
        idMap.sendIDMapUpdate()

        expect(!!Object.keys(idMap.idMap['testDocument'].ids['translation']))
    })

    test('test moveResourceMap', () => {
        idMap.moveResourceMap( 'translation2', 'translation', null, parentResourceMap.resourceID )
        idMap.sendIDMapUpdate() 

        expect(Object.keys(idMap.idMap).length).toBe(2)
        expect(Object.keys(idMap.idMap['testDocument'].ids).length).toBe(2)
        expect(!!Object.keys(idMap.idMap['translation2']))
    })

    test('test checkIn', () => {
        // TODO need resource entries for the other resources
        idMap.checkIn([parentResourceEntry])

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
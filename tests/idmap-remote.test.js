const { getBlankResourceMap } = require('../public/main-process/id-map-authority')
const { IDMapRemote } = require('../public/main-process/IDMapRemote')
const { v4: uuidv4 } = require('uuid')

describe('Exercise the functions of the IDMapRemote module', () => {
    const onUpdate = jest.fn();
    const idMap = new IDMapRemote("{}", onUpdate) 
    
    const parentResourceID = uuidv4()
    // create a facs with stuff in it and add it to the parent
    // add a second copy to the parent
    const imagesResourceMap = getBlankResourceMap(uuidv4(), 'facs')
    imagesResourceMap.ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
    imagesResourceMap.ids['f000'] = { type: 'facs', thumbnailURL: 'https://url.to/thumnbail.jpg' }
    const transcriptionResourceMap = getBlankResourceMap(uuidv4(), 'text')
    transcriptionResourceMap.ids['div-a'] = { type: 'text', useCount: 1 }
    transcriptionResourceMap.ids['div-b'] = { type: 'text', useCount: 1 }

    test('test addResource', () => {
        idMap.addResource( 'testDoc', null, getBlankResourceMap(parentResourceID, 'teidoc'))
        idMap.addResource( 'images', 'testDoc', imagesResourceMap )
        idMap.addResource( 'transcription', 'testDoc', transcriptionResourceMap )
        idMap.sendIDMapUpdate() 
    
        // expect(onUpdate).toHaveBeenCalled()
        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(2)
    })

    test('test removeResources', () => {
        idMap.removeResources([ transcriptionResourceMap.resourceID ])
        idMap.sendIDMapUpdate()

        // expect(onUpdate).toHaveBeenCalledTimes(2)
        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(1)
    })

    test('test recoverResources', () => {
        idMap.removeResources([ transcriptionResourceMap.resourceID ])
        idMap.sendIDMapUpdate() 

        // expect(onUpdate).toHaveBeenCalledTimes(3)
        expect(Object.keys(idMap.idMap).length).toBe(1)
        expect(Object.keys(idMap.idMap['testDoc'].ids).length).toBe(2)
    })

    test('test changeID', () => {
        // TODO
    })

    test('test moveResourceMap', () => {
        // TODO
    })

    test('test checkIn', () => {
        // TODO
    })

    test('test checkOut', () => {
        // TODO
    })

    test('test commitResource', () => {
        // TODO
    })
})